var zo = { exports: {} }, vn = {};
var td;
function ch() {
  if (td) return vn;
  td = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), el = /* @__PURE__ */ Symbol.for("react.fragment");
  function X(h, fl, ol) {
    var Rl = null;
    if (ol !== void 0 && (Rl = "" + ol), fl.key !== void 0 && (Rl = "" + fl.key), "key" in fl) {
      ol = {};
      for (var Ll in fl)
        Ll !== "key" && (ol[Ll] = fl[Ll]);
    } else ol = fl;
    return fl = ol.ref, {
      $$typeof: A,
      type: h,
      key: Rl,
      ref: fl !== void 0 ? fl : null,
      props: ol
    };
  }
  return vn.Fragment = el, vn.jsx = X, vn.jsxs = X, vn;
}
var ad;
function fh() {
  return ad || (ad = 1, zo.exports = ch()), zo.exports;
}
var b = fh(), _o = { exports: {} }, G = {};
var ud;
function oh() {
  if (ud) return G;
  ud = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), el = /* @__PURE__ */ Symbol.for("react.portal"), X = /* @__PURE__ */ Symbol.for("react.fragment"), h = /* @__PURE__ */ Symbol.for("react.strict_mode"), fl = /* @__PURE__ */ Symbol.for("react.profiler"), ol = /* @__PURE__ */ Symbol.for("react.consumer"), Rl = /* @__PURE__ */ Symbol.for("react.context"), Ll = /* @__PURE__ */ Symbol.for("react.forward_ref"), tl = /* @__PURE__ */ Symbol.for("react.suspense"), Al = /* @__PURE__ */ Symbol.for("react.memo"), j = /* @__PURE__ */ Symbol.for("react.lazy"), T = /* @__PURE__ */ Symbol.for("react.activity"), H = /* @__PURE__ */ Symbol.for("react.view_transition"), Sl = Symbol.iterator;
  function Cl(s) {
    return s === null || typeof s != "object" ? null : (s = Sl && s[Sl] || s["@@iterator"], typeof s == "function" ? s : null);
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
  }, nl = Object.assign, xl = {};
  function $(s, _, R) {
    this.props = s, this.context = _, this.refs = xl, this.updater = R || bl;
  }
  $.prototype.isReactComponent = {}, $.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, $.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function Yl() {
  }
  Yl.prototype = $.prototype;
  function Q(s, _, R) {
    this.props = s, this.context = _, this.refs = xl, this.updater = R || bl;
  }
  var Tl = Q.prototype = new Yl();
  Tl.constructor = Q, nl(Tl, $.prototype), Tl.isPureReactComponent = !0;
  var Kl = Array.isArray;
  function Z() {
  }
  var il = { H: null, A: null, T: null, S: null }, Il = Object.prototype.hasOwnProperty;
  function nt(s, _, R) {
    var M = R.ref;
    return {
      $$typeof: A,
      type: s,
      key: _,
      ref: M !== void 0 ? M : null,
      props: R
    };
  }
  function it(s, _) {
    return nt(s.type, _, s.props);
  }
  function ot(s) {
    return typeof s == "object" && s !== null && s.$$typeof === A;
  }
  function st(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(R) {
      return _[R];
    });
  }
  var Jt = /\/+/g;
  function _l(s, _) {
    return typeof s == "object" && s !== null && s.key != null ? st("" + s.key) : _.toString(36);
  }
  function N(s) {
    switch (s.status) {
      case "fulfilled":
        return s.value;
      case "rejected":
        throw s.reason;
      default:
        switch (typeof s.status == "string" ? s.then(Z, Z) : (s.status = "pending", s.then(
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
  function x(s, _, R, M, al) {
    var F = typeof s;
    (F === "undefined" || F === "boolean") && (s = null);
    var ul = !1;
    if (s === null) ul = !0;
    else
      switch (F) {
        case "bigint":
        case "string":
        case "number":
          ul = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case A:
            case el:
              ul = !0;
              break;
            case j:
              return ul = s._init, x(
                ul(s._payload),
                _,
                R,
                M,
                al
              );
          }
      }
    if (ul)
      return al = al(s), ul = M === "" ? "." + _l(s, 0) : M, Kl(al) ? (R = "", ul != null && (R = ul.replace(Jt, "$&/") + "/"), x(al, _, R, "", function(xt) {
        return xt;
      })) : al != null && (ot(al) && (al = it(
        al,
        R + (al.key == null || s && s.key === al.key ? "" : ("" + al.key).replace(
          Jt,
          "$&/"
        ) + "/") + ul
      )), _.push(al)), 1;
    ul = 0;
    var U = M === "" ? "." : M + ":";
    if (Kl(s))
      for (var Y = 0; Y < s.length; Y++)
        M = s[Y], F = U + _l(M, Y), ul += x(
          M,
          _,
          R,
          F,
          al
        );
    else if (Y = Cl(s), typeof Y == "function")
      for (s = Y.call(s), Y = 0; !(M = s.next()).done; )
        M = M.value, F = U + _l(M, Y++), ul += x(
          M,
          _,
          R,
          F,
          al
        );
    else if (F === "object") {
      if (typeof s.then == "function")
        return x(
          N(s),
          _,
          R,
          M,
          al
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return ul;
  }
  function B(s, _, R) {
    if (s == null) return s;
    var M = [], al = 0;
    return x(s, M, "", "", function(F) {
      return _.call(R, F, al++);
    }), M;
  }
  function k(s) {
    if (s._status === -1) {
      var _ = s._result, R = _();
      R.then(
        function(M) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = M, R.status === void 0 && (R.status = "fulfilled", R.value = M));
        },
        function(M) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = M, R.status === void 0 && (R.status = "rejected", R.reason = M));
        }
      ), s._status === -1 && (s._status = 0, s._result = R);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var sl = typeof reportError == "function" ? reportError : function(s) {
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
  function zt(s) {
    var _ = il.T, R = {};
    R.types = _ !== null ? _.types : null, il.T = R;
    try {
      var M = s(), al = il.S;
      al !== null && al(R, M), typeof M == "object" && M !== null && typeof M.then == "function" && M.then(Z, sl);
    } catch (F) {
      sl(F);
    } finally {
      _ !== null && R.types !== null && (_.types = R.types), il.T = _;
    }
  }
  function yt(s) {
    var _ = il.T;
    if (_ !== null) {
      var R = _.types;
      R === null ? _.types = [s] : R.indexOf(s) === -1 && R.push(s);
    } else zt(yt.bind(null, s));
  }
  var Jl = {
    map: B,
    forEach: function(s, _, R) {
      B(
        s,
        function() {
          _.apply(this, arguments);
        },
        R
      );
    },
    count: function(s) {
      var _ = 0;
      return B(s, function() {
        _++;
      }), _;
    },
    toArray: function(s) {
      return B(s, function(_) {
        return _;
      }) || [];
    },
    only: function(s) {
      if (!ot(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return G.Activity = T, G.Children = Jl, G.Component = $, G.Fragment = X, G.Profiler = fl, G.PureComponent = Q, G.StrictMode = h, G.Suspense = tl, G.ViewTransition = H, G.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = il, G.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return il.H.useMemoCache(s);
    }
  }, G.addTransitionType = yt, G.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, G.cacheSignal = function() {
    return null;
  }, G.cloneElement = function(s, _, R) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var M = nl({}, s.props), al = s.key;
    if (_ != null)
      for (F in _.key !== void 0 && (al = "" + _.key), _)
        !Il.call(_, F) || F === "key" || F === "__self" || F === "__source" || F === "ref" && _.ref === void 0 || (M[F] = _[F]);
    var F = arguments.length - 2;
    if (F === 1) M.children = R;
    else if (1 < F) {
      for (var ul = Array(F), U = 0; U < F; U++)
        ul[U] = arguments[U + 2];
      M.children = ul;
    }
    return nt(s.type, al, M);
  }, G.createContext = function(s) {
    return s = {
      $$typeof: Rl,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: ol,
      _context: s
    }, s;
  }, G.createElement = function(s, _, R) {
    var M, al = {}, F = null;
    if (_ != null)
      for (M in _.key !== void 0 && (F = "" + _.key), _)
        Il.call(_, M) && M !== "key" && M !== "__self" && M !== "__source" && (al[M] = _[M]);
    var ul = arguments.length - 2;
    if (ul === 1) al.children = R;
    else if (1 < ul) {
      for (var U = Array(ul), Y = 0; Y < ul; Y++)
        U[Y] = arguments[Y + 2];
      al.children = U;
    }
    if (s && s.defaultProps)
      for (M in ul = s.defaultProps, ul)
        al[M] === void 0 && (al[M] = ul[M]);
    return nt(s, F, al);
  }, G.createRef = function() {
    return { current: null };
  }, G.forwardRef = function(s) {
    return { $$typeof: Ll, render: s };
  }, G.isValidElement = ot, G.lazy = function(s) {
    return {
      $$typeof: j,
      _payload: { _status: -1, _result: s },
      _init: k
    };
  }, G.memo = function(s, _) {
    return {
      $$typeof: Al,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, G.startTransition = zt, G.unstable_useCacheRefresh = function() {
    return il.H.useCacheRefresh();
  }, G.use = function(s) {
    return il.H.use(s);
  }, G.useActionState = function(s, _, R) {
    return il.H.useActionState(s, _, R);
  }, G.useCallback = function(s, _) {
    return il.H.useCallback(s, _);
  }, G.useContext = function(s) {
    return il.H.useContext(s);
  }, G.useDebugValue = function() {
  }, G.useDeferredValue = function(s, _) {
    return il.H.useDeferredValue(s, _);
  }, G.useEffect = function(s, _) {
    return il.H.useEffect(s, _);
  }, G.useEffectEvent = function(s) {
    return il.H.useEffectEvent(s);
  }, G.useId = function() {
    return il.H.useId();
  }, G.useImperativeHandle = function(s, _, R) {
    return il.H.useImperativeHandle(s, _, R);
  }, G.useInsertionEffect = function(s, _) {
    return il.H.useInsertionEffect(s, _);
  }, G.useLayoutEffect = function(s, _) {
    return il.H.useLayoutEffect(s, _);
  }, G.useMemo = function(s, _) {
    return il.H.useMemo(s, _);
  }, G.useOptimistic = function(s, _) {
    return il.H.useOptimistic(s, _);
  }, G.useReducer = function(s, _, R) {
    return il.H.useReducer(s, _, R);
  }, G.useRef = function(s) {
    return il.H.useRef(s);
  }, G.useState = function(s) {
    return il.H.useState(s);
  }, G.useSyncExternalStore = function(s, _, R) {
    return il.H.useSyncExternalStore(
      s,
      _,
      R
    );
  }, G.useTransition = function() {
    return il.H.useTransition();
  }, G.version = "19.3.0", G;
}
var ed;
function Ro() {
  return ed || (ed = 1, _o.exports = oh()), _o.exports;
}
var Ml = Ro(), Oo = { exports: {} }, yn = {}, No = { exports: {} }, Ao = {};
var nd;
function sh() {
  return nd || (nd = 1, (function(A) {
    function el(N, x) {
      var B = N.length;
      N.push(x);
      l: for (; 0 < B; ) {
        var k = B - 1 >>> 1, sl = N[k];
        if (0 < fl(sl, x))
          N[k] = x, N[B] = sl, B = k;
        else break l;
      }
    }
    function X(N) {
      return N.length === 0 ? null : N[0];
    }
    function h(N) {
      if (N.length === 0) return null;
      var x = N[0], B = N.pop();
      if (B !== x) {
        N[0] = B;
        l: for (var k = 0, sl = N.length, zt = sl >>> 1; k < zt; ) {
          var yt = 2 * (k + 1) - 1, Jl = N[yt], s = yt + 1, _ = N[s];
          if (0 > fl(Jl, B))
            s < sl && 0 > fl(_, Jl) ? (N[k] = _, N[s] = B, k = s) : (N[k] = Jl, N[yt] = B, k = yt);
          else if (s < sl && 0 > fl(_, B))
            N[k] = _, N[s] = B, k = s;
          else break l;
        }
      }
      return x;
    }
    function fl(N, x) {
      var B = N.sortIndex - x.sortIndex;
      return B !== 0 ? B : N.id - x.id;
    }
    if (A.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var ol = performance;
      A.unstable_now = function() {
        return ol.now();
      };
    } else {
      var Rl = Date, Ll = Rl.now();
      A.unstable_now = function() {
        return Rl.now() - Ll;
      };
    }
    var tl = [], Al = [], j = 1, T = null, H = 3, Sl = !1, Cl = !1, bl = !1, nl = !1, xl = typeof setTimeout == "function" ? setTimeout : null, $ = typeof clearTimeout == "function" ? clearTimeout : null, Yl = typeof setImmediate < "u" ? setImmediate : null;
    function Q(N) {
      for (var x = X(Al); x !== null; ) {
        if (x.callback === null) h(Al);
        else if (x.startTime <= N)
          h(Al), x.sortIndex = x.expirationTime, el(tl, x);
        else break;
        x = X(Al);
      }
    }
    function Tl(N) {
      if (bl = !1, Q(N), !Cl)
        if (X(tl) !== null)
          Cl = !0, Kl || (Kl = !0, ot());
        else {
          var x = X(Al);
          x !== null && _l(Tl, x.startTime - N);
        }
    }
    var Kl = !1, Z = -1, il = 5, Il = -1;
    function nt() {
      return nl ? !0 : !(A.unstable_now() - Il < il);
    }
    function it() {
      if (nl = !1, Kl) {
        var N = A.unstable_now();
        Il = N;
        var x = !0;
        try {
          l: {
            Cl = !1, bl && (bl = !1, $(Z), Z = -1), Sl = !0;
            var B = H;
            try {
              t: {
                for (Q(N), T = X(tl); T !== null && !(T.expirationTime > N && nt()); ) {
                  var k = T.callback;
                  if (typeof k == "function") {
                    T.callback = null, H = T.priorityLevel;
                    var sl = k(
                      T.expirationTime <= N
                    );
                    if (N = A.unstable_now(), typeof sl == "function") {
                      T.callback = sl, Q(N), x = !0;
                      break t;
                    }
                    T === X(tl) && h(tl), Q(N);
                  } else h(tl);
                  T = X(tl);
                }
                if (T !== null) x = !0;
                else {
                  var zt = X(Al);
                  zt !== null && _l(
                    Tl,
                    zt.startTime - N
                  ), x = !1;
                }
              }
              break l;
            } finally {
              T = null, H = B, Sl = !1;
            }
            x = void 0;
          }
        } finally {
          x ? ot() : Kl = !1;
        }
      }
    }
    var ot;
    if (typeof Yl == "function")
      ot = function() {
        Yl(it);
      };
    else if (typeof MessageChannel < "u") {
      var st = new MessageChannel(), Jt = st.port2;
      st.port1.onmessage = it, ot = function() {
        Jt.postMessage(null);
      };
    } else
      ot = function() {
        xl(it, 0);
      };
    function _l(N, x) {
      Z = xl(function() {
        N(A.unstable_now());
      }, x);
    }
    A.unstable_IdlePriority = 5, A.unstable_ImmediatePriority = 1, A.unstable_LowPriority = 4, A.unstable_NormalPriority = 3, A.unstable_Profiling = null, A.unstable_UserBlockingPriority = 2, A.unstable_cancelCallback = function(N) {
      N.callback = null;
    }, A.unstable_forceFrameRate = function(N) {
      0 > N || 125 < N ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : il = 0 < N ? Math.floor(1e3 / N) : 5;
    }, A.unstable_getCurrentPriorityLevel = function() {
      return H;
    }, A.unstable_next = function(N) {
      switch (H) {
        case 1:
        case 2:
        case 3:
          var x = 3;
          break;
        default:
          x = H;
      }
      var B = H;
      H = x;
      try {
        return N();
      } finally {
        H = B;
      }
    }, A.unstable_requestPaint = function() {
      nl = !0;
    }, A.unstable_runWithPriority = function(N, x) {
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
      var B = H;
      H = N;
      try {
        return x();
      } finally {
        H = B;
      }
    }, A.unstable_scheduleCallback = function(N, x, B) {
      var k = A.unstable_now();
      switch (typeof B == "object" && B !== null ? (B = B.delay, B = typeof B == "number" && 0 < B ? k + B : k) : B = k, N) {
        case 1:
          var sl = -1;
          break;
        case 2:
          sl = 250;
          break;
        case 5:
          sl = 1073741823;
          break;
        case 4:
          sl = 1e4;
          break;
        default:
          sl = 5e3;
      }
      return sl = B + sl, N = {
        id: j++,
        callback: x,
        priorityLevel: N,
        startTime: B,
        expirationTime: sl,
        sortIndex: -1
      }, B > k ? (N.sortIndex = B, el(Al, N), X(tl) === null && N === X(Al) && (bl ? ($(Z), Z = -1) : bl = !0, _l(Tl, B - k))) : (N.sortIndex = sl, el(tl, N), Cl || Sl || (Cl = !0, Kl || (Kl = !0, ot()))), N;
    }, A.unstable_shouldYield = nt, A.unstable_wrapCallback = function(N) {
      var x = H;
      return function() {
        var B = H;
        H = x;
        try {
          return N.apply(this, arguments);
        } finally {
          H = B;
        }
      };
    };
  })(Ao)), Ao;
}
var id;
function rh() {
  return id || (id = 1, No.exports = sh()), No.exports;
}
var Do = { exports: {} }, et = {};
var cd;
function mh() {
  if (cd) return et;
  cd = 1;
  var A = Ro();
  function el(j) {
    var T = "https://react.dev/errors/" + j;
    if (1 < arguments.length) {
      T += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var H = 2; H < arguments.length; H++)
        T += "&args[]=" + encodeURIComponent(arguments[H]);
    }
    return "Minified React error #" + j + "; visit " + T + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function X() {
  }
  var h = {
    d: {
      f: X,
      r: function() {
        throw Error(el(522));
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
  }, fl = /* @__PURE__ */ Symbol.for("react.portal"), ol = /* @__PURE__ */ Symbol.for("react.recoverable"), Rl = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function Ll(j, T, H) {
    var Sl = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: fl,
      key: Sl == null ? null : Sl === Rl ? Rl : "" + Sl,
      children: j,
      containerInfo: T,
      implementation: H
    };
  }
  var tl = A.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function Al(j, T) {
    if (j === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return et.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = h, et.browser = function(j) {
    return { $$typeof: ol, _reason: j };
  }, et.createPortal = function(j, T) {
    var H = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(el(299));
    return Ll(j, T, null, H);
  }, et.flushSync = function(j) {
    var T = tl.T, H = h.p;
    try {
      if (tl.T = null, h.p = 2, j) return j();
    } finally {
      tl.T = T, h.p = H, h.d.f();
    }
  }, et.preconnect = function(j, T) {
    typeof j == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, h.d.C(j, T));
  }, et.prefetchDNS = function(j) {
    typeof j == "string" && h.d.D(j);
  }, et.preinit = function(j, T) {
    if (typeof j == "string" && T && typeof T.as == "string") {
      var H = T.as, Sl = Al(H, T.crossOrigin), Cl = typeof T.integrity == "string" ? T.integrity : void 0, bl = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      H === "style" ? h.d.S(
        j,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: Sl,
          integrity: Cl,
          fetchPriority: bl
        }
      ) : H === "script" && h.d.X(j, {
        crossOrigin: Sl,
        integrity: Cl,
        fetchPriority: bl,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, et.preinitModule = function(j, T) {
    if (typeof j == "string")
      if (typeof T == "object" && T !== null) {
        if (T.as == null || T.as === "script") {
          var H = Al(
            T.as,
            T.crossOrigin
          );
          h.d.M(j, {
            crossOrigin: H,
            integrity: typeof T.integrity == "string" ? T.integrity : void 0,
            nonce: typeof T.nonce == "string" ? T.nonce : void 0,
            fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
          });
        }
      } else T == null && h.d.M(j);
  }, et.preload = function(j, T) {
    if (typeof j == "string" && typeof T == "object" && T !== null && typeof T.as == "string") {
      var H = T.as, Sl = Al(H, T.crossOrigin);
      h.d.L(j, H, {
        crossOrigin: Sl,
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
        var H = Al(T.as, T.crossOrigin);
        h.d.m(j, {
          as: typeof T.as == "string" && T.as !== "script" ? T.as : void 0,
          crossOrigin: H,
          integrity: typeof T.integrity == "string" ? T.integrity : void 0,
          nonce: typeof T.nonce == "string" ? T.nonce : void 0,
          fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
        });
      } else h.d.m(j);
  }, et.requestFormReset = function(j) {
    h.d.r(j);
  }, et.unstable_batchedUpdates = function(j, T) {
    return j(T);
  }, et.useFormState = function(j, T, H) {
    return tl.H.useFormState(j, T, H);
  }, et.useFormStatus = function() {
    return tl.H.useHostTransitionStatus();
  }, et.version = "19.3.0", et;
}
var fd;
function dh() {
  if (fd) return Do.exports;
  fd = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (el) {
        console.error(el);
      }
  }
  return A(), Do.exports = mh(), Do.exports;
}
var od;
function vh() {
  if (od) return yn;
  od = 1;
  var A = rh(), el = Ro(), X = dh();
  function h(l) {
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
  function ol(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function Rl(l) {
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
  function tl(l) {
    if (ol(l) !== l)
      throw Error(h(188));
  }
  function Al(l) {
    var t = l.alternate;
    if (!t) {
      if (t = ol(l), t === null) throw Error(h(188));
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
          if (n === a) return tl(e), l;
          if (n === u) return tl(e), t;
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
  function H(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function Sl(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function Cl(l) {
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
  function nl(l) {
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
  var xl = null, $ = null;
  function Yl(l, t, a) {
    return l === a ? !0 : l === t ? (xl = l, !0) : !1;
  }
  function Q(l, t, a) {
    return l === a ? ($ = l, !1) : l === t ? ($ !== null && (xl = l), !0) : !1;
  }
  function Tl(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function Kl(l, t, a) {
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
  var Z = Object.assign, il = /* @__PURE__ */ Symbol.for("react.element"), Il = /* @__PURE__ */ Symbol.for("react.transitional.element"), nt = /* @__PURE__ */ Symbol.for("react.portal"), it = /* @__PURE__ */ Symbol.for("react.fragment"), ot = /* @__PURE__ */ Symbol.for("react.strict_mode"), st = /* @__PURE__ */ Symbol.for("react.profiler"), Jt = /* @__PURE__ */ Symbol.for("react.consumer"), _l = /* @__PURE__ */ Symbol.for("react.context"), N = /* @__PURE__ */ Symbol.for("react.forward_ref"), x = /* @__PURE__ */ Symbol.for("react.suspense"), B = /* @__PURE__ */ Symbol.for("react.suspense_list"), k = /* @__PURE__ */ Symbol.for("react.memo"), sl = /* @__PURE__ */ Symbol.for("react.lazy"), zt = /* @__PURE__ */ Symbol.for("react.activity"), yt = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), Jl = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), R = Symbol.iterator;
  function M(l) {
    return l === null || typeof l != "object" ? null : (l = R && l[R] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var al = /* @__PURE__ */ Symbol.for("react.client.reference");
  function F(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === al ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case it:
        return "Fragment";
      case st:
        return "Profiler";
      case ot:
        return "StrictMode";
      case x:
        return "Suspense";
      case B:
        return "SuspenseList";
      case zt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case nt:
          return "Portal";
        case _l:
          return l.displayName || "Context";
        case Jt:
          return (l._context.displayName || "Context") + ".Consumer";
        case N:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case k:
          return t = l.displayName || null, t !== null ? t : F(l.type) || "Memo";
        case sl:
          t = l._payload, l = l._init;
          try {
            return F(l(t));
          } catch {
          }
      }
    return null;
  }
  var ul = Array.isArray, U = el.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Y = X.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, xt = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, Se = [], ct = -1;
  function Bt(l) {
    return { current: l };
  }
  function Bl(l) {
    0 > ct || (l.current = Se[ct], Se[ct] = null, ct--);
  }
  function vl(l, t) {
    ct++, Se[ct] = l.current, l.current = t;
  }
  var _t = Bt(null), Ma = Bt(null), la = Bt(null), wt = Bt(null);
  function uu(l, t) {
    switch (vl(la, t), vl(Ma, l), vl(_t, null), t.nodeType) {
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
    Bl(_t), vl(_t, l);
  }
  function Ca() {
    Bl(_t), Bl(Ma), Bl(la);
  }
  function Du(l) {
    var t = l.memoizedState;
    t !== null && (ye._currentValue = t.memoizedState, vl(wt, l)), t = _t.current;
    var a = rm(t, l.type);
    t !== a && (vl(Ma, l), vl(_t, a));
  }
  function Mu(l) {
    Ma.current === l && (Bl(_t), Bl(Ma)), wt.current === l && (Bl(wt), ye._currentValue = xt);
  }
  var S, V;
  function J(l) {
    if (S === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        S = t && t[1] || "", V = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + S + l + V;
  }
  var Dl = !1;
  function ta(l, t) {
    if (!l || Dl) return "";
    Dl = !0;
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
                  var r = O;
                }
                Reflect.construct(l, [], z);
              } else {
                try {
                  z.call();
                } catch (O) {
                  r = O;
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
                r = O;
              }
              (z = l()) && typeof z.catch == "function" && z.catch(function() {
              });
            }
          } catch (O) {
            if (O && r && typeof O.stack == "string")
              return [O.stack, r.stack];
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
      Dl = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? J(a) : "";
  }
  function be(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return J(l.type);
      case 16:
        return J("Lazy");
      case 13:
        return l.child !== t && t !== null ? J("Suspense Fallback") : J("Suspense");
      case 19:
        return J("SuspenseList");
      case 0:
      case 15:
        return ta(l.type, !1);
      case 11:
        return ta(l.type.render, !1);
      case 1:
        return ta(l.type, !0);
      case 31:
        return J("Activity");
      case 30:
        return J("ViewTransition");
      default:
        return "";
    }
  }
  function po(l) {
    try {
      var t = "", a = null;
      do
        t += be(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Li = Object.prototype.hasOwnProperty, Ki = A.unstable_scheduleCallback, Ji = A.unstable_cancelCallback, md = A.unstable_shouldYield, dd = A.unstable_requestPaint, Ot = A.unstable_now, vd = A.unstable_getCurrentPriorityLevel, jo = A.unstable_ImmediatePriority, Ho = A.unstable_UserBlockingPriority, gn = A.unstable_NormalPriority, yd = A.unstable_LowPriority, xo = A.unstable_IdlePriority, hd = A.log, gd = A.unstable_setDisableYieldValue, Te = null, Nt = null;
  function Ua(l) {
    if (typeof hd == "function" && gd(l), Nt && typeof Nt.setStrictMode == "function")
      try {
        Nt.setStrictMode(Te, l);
      } catch {
      }
  }
  var At = Math.clz32 ? Math.clz32 : Td, Sd = Math.log, bd = Math.LN2;
  function Td(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (Sd(l) / bd | 0) | 0;
  }
  var Sn = 256, bn = 262144, Tn = 4194304;
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
  function En(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = u & 134217727;
    return c !== 0 ? (u = c & ~n, u !== 0 ? e = eu(u) : (i &= c, i !== 0 ? e = eu(i) : a || (a = c & ~l, a !== 0 && (e = eu(a))))) : (c = u & ~n, c !== 0 ? e = eu(c) : i !== 0 ? e = eu(i) : a || (a = u & ~l, a !== 0 && (e = eu(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function Ee(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function Bo(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var u = 31 - At(a), e = 1 << u;
        t |= l[u], a &= ~e;
      }
    return t;
  }
  function Ed(l, t) {
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
    var l = Tn;
    return Tn <<= 1, (Tn & 62914560) === 0 && (Tn = 4194304), l;
  }
  function wi(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function ze(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function zd(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, f = l.expirationTimes, d = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - At(a), z = 1 << g;
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
    var u = 31 - At(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Go(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - At(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function Xo(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : $i(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function $i(l) {
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
  function Fi(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Qo() {
    var l = Y.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : $m(l.type));
  }
  function Zo(l, t) {
    var a = Y.p;
    try {
      return Y.p = l, t();
    } finally {
      Y.p = a;
    }
  }
  var da = Math.random().toString(36).slice(2), kl = "__reactFiber$" + da, ht = "__reactProps$" + da, Cu = "__reactContainer$" + da, Vo = "__reactEvents$" + da, _d = "__reactListeners$" + da, Od = "__reactHandles$" + da, Lo = "__reactResources$" + da, _e = "__reactMarker$" + da, zn = "__reactLoad$" + da;
  function _n(l) {
    delete l[kl], delete l[ht], delete l[_d], delete l[Od];
  }
  function nu(l) {
    var t;
    if (t = l[kl]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[Cu] || a[kl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Mm(l); l !== null; ) {
            if (a = l[kl]) return a;
            l = Mm(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Uu(l) {
    if (l = l[kl] || l[Cu]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function Oe(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(h(33));
  }
  function Ru(l) {
    var t = l[Lo];
    return t || (t = l[Lo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function wl(l) {
    l[_e] = !0;
  }
  function Ko(l) {
    l[zn] = void 0;
  }
  var Jo = /* @__PURE__ */ new Set(), wo = {};
  function iu(l, t) {
    pu(l, t), pu(l + "Capture", t);
  }
  function pu(l, t) {
    for (wo[l] = t, l = 0; l < t.length; l++)
      Jo.add(t[l]);
  }
  var Nd = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), $o = {}, Fo = {};
  function Ad(l) {
    return Li.call(Fo, l) ? !0 : Li.call($o, l) ? !1 : Nd.test(l) ? Fo[l] = !0 : ($o[l] = !0, !1);
  }
  var rl = !1;
  function Wo() {
    var l = rl;
    return rl = !1, l;
  }
  function On(l, t, a) {
    if (Ad(t))
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
  function Nn(l, t, a) {
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
  function Dt(l) {
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
  function Dd(l, t, a) {
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
  function Wi(l) {
    if (!l._valueTracker) {
      var t = Io(l) ? "checked" : "value";
      l._valueTracker = Dd(
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
  var Md = /[\n"\\]/g;
  function qt(l) {
    return l.replace(
      Md,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function Ii(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Dt(t)) : l.value !== "" + Dt(t) && (l.value = "" + Dt(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? ki(l, Dt(l.value)) : ki(l, Dt(t)) : a != null ? ki(l, Dt(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + Dt(c) : l.removeAttribute("name");
  }
  function Po(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        Wi(l);
        return;
      }
      a = a != null ? "" + Dt(a) : "", t = t != null ? "" + Dt(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = c ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), Wi(l);
  }
  function ki(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function ju(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + Dt(a), t = null, e = 0; e < l.length; e++) {
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
    if (t != null && (t = "" + Dt(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + Dt(a) : "";
  }
  function ts(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(h(92));
        if (ul(u)) {
          if (1 < u.length) throw Error(h(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = Dt(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), Wi(l);
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
  var Cd = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function as(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || Cd.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
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
  function Pi(l) {
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
  var Ud = /* @__PURE__ */ new Map([
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
  ]), Rd = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function An(l) {
    return Rd.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function aa() {
  }
  var lc = null;
  function tc(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var xu = null, Bu = null;
  function es(l) {
    var t = Uu(l);
    if (t && (l = t.stateNode)) {
      var a = l[ht] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (Ii(
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
                Ii(
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
          t = a.value, t != null && ju(l, !!a.multiple, t, !1);
      }
    }
  }
  var ac = !1;
  function ns(l, t, a) {
    if (ac) return l(t, a);
    ac = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (ac = !1, (xu !== null || Bu !== null) && (Ai(), xu && (t = xu, l = Bu, Bu = xu = null, es(t), l)))
        for (t = 0; t < l.length; t++) es(l[t]);
    }
  }
  function Ne(l, t) {
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
  var ya = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), uc = !1;
  if (ya)
    try {
      var Ae = {};
      Object.defineProperty(Ae, "passive", {
        get: function() {
          uc = !0;
        }
      }), window.addEventListener("test", Ae, Ae), window.removeEventListener("test", Ae, Ae);
    } catch {
      uc = !1;
    }
  var Ra = null, ec = null, Dn = null;
  function is() {
    if (Dn) return Dn;
    var l, t = ec, a = t.length, u, e = "value" in Ra ? Ra.value : Ra.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return Dn = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function Mn(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function Cn() {
    return !0;
  }
  function cs() {
    return !1;
  }
  function rt(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? Cn : cs, this.isPropagationStopped = cs, this;
    }
    return Z(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = Cn);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = Cn);
      },
      persist: function() {
      },
      isPersistent: Cn
    }), t;
  }
  var pa = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Un = rt(pa), De = Z({}, pa, { view: 0, detail: 0 }), pd = rt(De), nc, ic, Me, Rn = Z({}, De, {
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
    getModifierState: fc,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Me && (Me && l.type === "mousemove" ? (nc = l.screenX - Me.screenX, ic = l.screenY - Me.screenY) : ic = nc = 0, Me = l), nc);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : ic;
    }
  }), fs = rt(Rn), jd = Z({}, Rn, { dataTransfer: 0 }), Hd = rt(jd), xd = Z({}, De, { relatedTarget: 0 }), cc = rt(xd), Bd = Z({}, pa, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), qd = rt(Bd), Yd = Z({}, pa, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), Gd = rt(Yd), Xd = Z({}, pa, { data: 0 }), os = rt(Xd), Qd = {
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
  }, Zd = {
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
  }, Vd = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Ld(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Vd[l]) ? !!t[l] : !1;
  }
  function fc() {
    return Ld;
  }
  var Kd = Z({}, De, {
    key: function(l) {
      if (l.key) {
        var t = Qd[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = Mn(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Zd[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: fc,
    charCode: function(l) {
      return l.type === "keypress" ? Mn(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? Mn(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), Jd = rt(Kd), wd = Z({}, Rn, {
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
  }), ss = rt(wd), $d = Z({}, pa, { submitter: 0 }), Fd = rt($d), Wd = Z({}, De, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: fc
  }), Id = rt(Wd), kd = Z({}, pa, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Pd = rt(kd), lv = Z({}, Rn, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), tv = rt(lv), av = Z({}, pa, {
    newState: 0,
    oldState: 0,
    source: 0
  }), uv = rt(av), ev = [9, 13, 27, 32], oc = ya && "CompositionEvent" in window, Ce = null;
  ya && "documentMode" in document && (Ce = document.documentMode);
  var nv = ya && "TextEvent" in window && !Ce, rs = ya && (!oc || Ce && 8 < Ce && 11 >= Ce), ms = " ", ds = !1;
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
  function ys(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var qu = !1;
  function iv(l, t) {
    switch (l) {
      case "compositionend":
        return ys(t);
      case "keypress":
        return t.which !== 32 ? null : (ds = !0, ms);
      case "textInput":
        return l = t.data, l === ms && ds ? null : l;
      default:
        return null;
    }
  }
  function cv(l, t) {
    if (qu)
      return l === "compositionend" || !oc && vs(l, t) ? (l = is(), Dn = ec = Ra = null, qu = !1, l) : null;
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
  function hs(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!fv[l.type] : t === "textarea";
  }
  function gs(l, t, a, u) {
    xu ? Bu ? Bu.push(u) : Bu = [u] : xu = u, t = pi(t, "onChange"), 0 < t.length && (a = new Un(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var Ue = null, Re = null;
  function ov(l) {
    em(l, 0);
  }
  function pn(l) {
    var t = Oe(l);
    if (ko(t)) return l;
  }
  function Ss(l, t) {
    if (l === "change") return t;
  }
  var bs = !1;
  if (ya) {
    var sc;
    if (ya) {
      var rc = "oninput" in document;
      if (!rc) {
        var Ts = document.createElement("div");
        Ts.setAttribute("oninput", "return;"), rc = typeof Ts.oninput == "function";
      }
      sc = rc;
    } else sc = !1;
    bs = sc && (!document.documentMode || 9 < document.documentMode);
  }
  function Es() {
    Ue && (Ue.detachEvent("onpropertychange", zs), Re = Ue = null);
  }
  function zs(l) {
    if (l.propertyName === "value" && pn(Re)) {
      var t = [];
      gs(
        t,
        Re,
        l,
        tc(l)
      ), ns(ov, t);
    }
  }
  function sv(l, t, a) {
    l === "focusin" ? (Es(), Ue = t, Re = a, Ue.attachEvent("onpropertychange", zs)) : l === "focusout" && Es();
  }
  function rv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return pn(Re);
  }
  function mv(l, t) {
    if (l === "click") return pn(t);
  }
  function dv(l, t) {
    if (l === "input" || l === "change")
      return pn(t);
  }
  function vv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var Mt = typeof Object.is == "function" ? Object.is : vv;
  function pe(l, t) {
    if (Mt(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Li.call(t, e) || !Mt(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function mc(l) {
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
    for (var t = mc(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = mc(l.document);
    }
    return t;
  }
  function dc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var yv = ya && "documentMode" in document && 11 >= document.documentMode, Yu = null, vc = null, je = null, yc = !1;
  function Ds(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    yc || Yu == null || Yu !== mc(u) || (u = Yu, "selectionStart" in u && dc(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), je && pe(je, u) || (je = u, u = pi(vc, "onSelect"), 0 < u.length && (t = new Un(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = Yu)));
  }
  function cu(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var Gu = {
    animationend: cu("Animation", "AnimationEnd"),
    animationiteration: cu("Animation", "AnimationIteration"),
    animationstart: cu("Animation", "AnimationStart"),
    transitionrun: cu("Transition", "TransitionRun"),
    transitionstart: cu("Transition", "TransitionStart"),
    transitioncancel: cu("Transition", "TransitionCancel"),
    transitionend: cu("Transition", "TransitionEnd")
  }, hc = {}, Ms = {};
  ya && (Ms = document.createElement("div").style, "AnimationEvent" in window || (delete Gu.animationend.animation, delete Gu.animationiteration.animation, delete Gu.animationstart.animation), "TransitionEvent" in window || delete Gu.transitionend.transition);
  function fu(l) {
    if (hc[l]) return hc[l];
    if (!Gu[l]) return l;
    var t = Gu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Ms)
        return hc[l] = t[a];
    return l;
  }
  var Cs = fu("animationend"), Us = fu("animationiteration"), Rs = fu("animationstart"), hv = fu("transitionrun"), gv = fu("transitionstart"), Sv = fu("transitioncancel"), ps = fu("transitionend"), js = /* @__PURE__ */ new Map(), gc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  gc.push("scrollEnd");
  function $t(l, t) {
    js.set(l, t), iu(t, [l]);
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
    var t = null, a = ne;
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
  var jn = typeof reportError == "function" ? reportError : function(l) {
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
  }, Yt = [], Xu = 0, Sc = 0;
  function Hn() {
    for (var l = Xu, t = Sc = Xu = 0; t < l; ) {
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
      n !== 0 && xs(a, e, n);
    }
  }
  function xn(l, t, a, u) {
    Yt[Xu++] = l, Yt[Xu++] = t, Yt[Xu++] = a, Yt[Xu++] = u, Sc |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function bc(l, t, a, u) {
    return xn(l, t, a, u), Bn(l);
  }
  function ou(l, t) {
    return xn(l, null, null, t), Bn(l);
  }
  function xs(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - At(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Bn(l) {
    if (50 < tn)
      throw tn = 0, Ni = null, Error(h(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Qu = {};
  function Tv(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function gt(l, t, a, u) {
    return new Tv(l, t, a, u);
  }
  function Tc(l) {
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
  function Bs(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function qn(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof u == "function") Tc(u) && (i = 1);
    else if (typeof u == "string")
      i = $y(
        l,
        a,
        _t.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (u) {
        case zt:
          return l = gt(31, a, t, e), l.elementType = zt, l.lanes = n, l;
        case it:
          return su(a.children, e, n, t);
        case ot:
          i = 8, e |= 24;
          break;
        case st:
          return l = gt(12, a, t, e | 2), l.elementType = st, l.lanes = n, l;
        case x:
          return l = gt(13, a, t, e), l.elementType = x, l.lanes = n, l;
        case B:
          return l = gt(19, a, t, e), l.elementType = B, l.lanes = n, l;
        case yt:
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
              case _l:
                i = 10;
                break l;
              case Jt:
                i = 9;
                break l;
              case N:
                i = 11;
                break l;
              case k:
                i = 14;
                break l;
              case sl:
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
  function Ec(l, t, a) {
    return l = gt(6, l, null, t), l.lanes = a, l;
  }
  function qs(l) {
    var t = gt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function zc(l, t, a) {
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
  var Ys = /* @__PURE__ */ new WeakMap();
  function Gt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Ys.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: po(t)
      }, Ys.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: po(t)
    };
  }
  var Zu = [], Vu = 0, Yn = null, He = 0, Xt = [], Qt = 0, ja = null, ua = 1, ea = "";
  function ba(l, t) {
    Zu[Vu++] = He, Zu[Vu++] = Yn, Yn = l, He = t;
  }
  function Gs(l, t, a) {
    Xt[Qt++] = ua, Xt[Qt++] = ea, Xt[Qt++] = ja, ja = l;
    var u = ua;
    l = ea;
    var e = 32 - At(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - At(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, ua = 1 << 32 - At(t) + e | a << e | u, ea = n + l;
    } else
      ua = 1 << n | a << e | u, ea = l;
  }
  function Gn(l) {
    l.return !== null && (ba(l, 1), Gs(l, 1, 0));
  }
  function _c(l) {
    for (; l === Yn; )
      Yn = Zu[--Vu], Zu[Vu] = null, He = Zu[--Vu], Zu[Vu] = null;
    for (; l === ja; )
      ja = Xt[--Qt], Xt[Qt] = null, ea = Xt[--Qt], Xt[Qt] = null, ua = Xt[--Qt], Xt[Qt] = null;
  }
  function Xs(l, t) {
    Xt[Qt++] = ua, Xt[Qt++] = ea, Xt[Qt++] = ja, ua = t.id, ea = t.overflow, ja = l;
  }
  var $l = null, Ol = null, w = !1, Ha = null, Zt = !1, Oc = Error(h(519));
  function xa(l) {
    var t = Error(
      h(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw xe(Gt(t, l)), Oc;
  }
  function Qs(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[kl] = l, t[ht] = u, a) {
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
        for (a = 0; a < un.length; a++)
          I(un[a], t);
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
        I("invalid", t), Po(
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
        I("invalid", t), ts(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || fm(t.textContent, a) ? (u.popover != null && (I("beforetoggle", t), I("toggle", t)), u.onScroll != null && I("scroll", t), u.onScrollEnd != null && I("scrollend", t), u.onClick != null && (t.onclick = aa), t = !0) : t = !1, t || xa(l, !0);
  }
  function Xn(l) {
    for ($l = l.return; $l; )
      switch ($l.tag) {
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
          $l = $l.return;
      }
  }
  function Lu(l) {
    if (l !== $l) return !1;
    if (!w) return Xn(l), w = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || to(l.type, l.memoizedProps)), a = !a), a && Ol && xa(l), Xn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      Ol = Dm(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      Ol = Dm(l);
    } else
      t === 27 ? (t = Ol, Ia(l.type) ? (l = so, so = null, Ol = l) : Ol = t) : Ol = $l ? Lt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function ru() {
    Ol = $l = null, w = !1;
  }
  function Nc() {
    var l = Ha;
    return l !== null && (Tt === null ? Tt = l : Tt.push.apply(
      Tt,
      l
    ), Ha = null), l;
  }
  function xe(l) {
    Ha === null ? Ha = [l] : Ha.push(l);
  }
  var Ac = Bt(null), mu = null, Ta = null;
  function Ba(l, t, a) {
    vl(Ac, t._currentValue), t._currentValue = a;
  }
  function Ea(l) {
    l._currentValue = Ac.current, Bl(Ac);
  }
  function Qn(l, t, a) {
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
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Qn(
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
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Qn(i, a, l), i = null;
      } else
        e.tag === 13 && e.memoizedState !== null && e.memoizedState.dehydrated === null ? (e.lanes |= a, i = e.alternate, i !== null && (i.lanes |= a), Qn(
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
          Mt(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === wt.current) {
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
      if (!Mt(
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
  function Pl(l) {
    return Zs(mu, l);
  }
  function Vn(l, t) {
    return mu === null && vu(l), Zs(l, t);
  }
  function Zs(l, t) {
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
  }, zv = A.unstable_scheduleCallback, _v = A.unstable_NormalPriority, Gl = {
    $$typeof: _l,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Mc() {
    return {
      controller: new Ev(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Be(l) {
    l.refCount--, l.refCount === 0 && zv(_v, function() {
      l.controller.abort();
    });
  }
  function Vs(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var a = l.transitionTypes;
      for (a === null && (a = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var u = t[l];
        a.indexOf(u) === -1 && a.push(u);
      }
    }
  }
  var qe = null;
  function Ov(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Ye = null, Cc = 0, yu = 0, Ku = null;
  function Nv(l, t) {
    if (Ye === null) {
      var a = Ye = [];
      Cc = 0, yu = Jf(), Ku = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Cc++, t.then(Ls, Ls), t;
  }
  function Ls() {
    if (--Cc === 0 && (qe = null, Ye !== null)) {
      Ku !== null && (Ku.status = "fulfilled");
      var l = Ye;
      Ye = null, yu = 0, Ku = null;
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
  var Ks = U.S;
  U.S = function(l, t) {
    if (q0 = Ot(), typeof t == "object" && t !== null && typeof t.then == "function" && Nv(l, t), qe !== null)
      for (var a = oe; a !== null; )
        Vs(a, qe), a = a.next;
    if (a = l.types, a !== null) {
      for (var u = oe; u !== null; )
        Vs(u, a), u = u.next;
      if (yu !== 0) {
        u = qe, u === null && (u = qe = []);
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.indexOf(n) === -1 && u.push(n);
        }
      }
    }
    Ks !== null && Ks(l, t);
  };
  var hu = Bt(null);
  function Uc() {
    var l = hu.current;
    return l !== null ? l : zl.pooledCache;
  }
  function Ln(l, t) {
    t === null ? vl(hu, hu.current) : vl(hu, t.pool);
  }
  function Js() {
    var l = Uc();
    return l === null ? null : { parent: Gl._currentValue, pool: l };
  }
  var Ju = Error(h(460)), Rc = Error(h(474)), Kn = Error(h(542)), Jn = { then: function() {
  } };
  function ws(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function $s(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(aa, aa), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Ws(l), l === void 0 && !("reason" in t) ? Error(h(600)) : l;
      default:
        if (typeof t.status == "string") t.then(aa, aa);
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
        throw Su = t, Ju;
    }
  }
  function gu(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Su = a, Ju) : a;
    }
  }
  var Su = null;
  function Fs() {
    if (Su === null) throw Error(h(459));
    var l = Su;
    return Su = null, l;
  }
  function Ws(l) {
    if (l === Ju || l === Kn)
      throw Error(h(483));
  }
  var wu = null, Ge = 0;
  function wn(l) {
    var t = Ge;
    return Ge += 1, wu === null && (wu = []), $s(wu, l, t);
  }
  function qa(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function $n(l, t) {
    throw t.$$typeof === il ? Error(h(525)) : (l = Object.prototype.toString.call(t), Error(
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
      return m = Sa(m, o), m.index = 0, m.sibling = null, m;
    }
    function n(m, o, v) {
      return m.index = v, l ? (v = m.alternate, v !== null ? (v = v.index, v < o ? (m.flags |= 2, o) : v) : (m.flags |= 134217730, o)) : (m.flags |= 1048576, o);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 134217730), m;
    }
    function c(m, o, v, E) {
      return o === null || o.tag !== 6 ? (o = Ec(v, m.mode, E), o.return = m, o) : (o = e(o, v), o.return = m, o);
    }
    function f(m, o, v, E) {
      var D = v.type;
      return D === it ? (m = g(
        m,
        o,
        v.props.children,
        E,
        v.key
      ), qa(m, v), m) : o !== null && (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === sl && gu(D) === o.type) ? (o = e(o, v.props), qa(o, v), o.return = m, o) : (o = qn(
        v.type,
        v.key,
        v.props,
        null,
        m.mode,
        E
      ), qa(o, v), o.return = m, o);
    }
    function d(m, o, v, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== v.containerInfo || o.stateNode.implementation !== v.implementation ? (o = zc(v, m.mode, E), o.return = m, o) : (o = e(o, v.children || []), o.return = m, o);
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
        return o = Ec(
          "" + o,
          m.mode,
          v
        ), o.return = m, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case Il:
            return v = qn(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              v
            ), qa(v, o), v.return = m, v;
          case nt:
            return o = zc(
              o,
              m.mode,
              v
            ), o.return = m, o;
          case sl:
            return o = gu(o), z(m, o, v);
        }
        if (ul(o) || M(o))
          return o = su(
            o,
            m.mode,
            v,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return z(m, wn(o), v);
        if (o.$$typeof === _l)
          return z(
            m,
            Vn(m, o),
            v
          );
        $n(m, o);
      }
      return null;
    }
    function r(m, o, v, E) {
      var D = o !== null ? o.key : null;
      if (typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint")
        return D !== null ? null : c(m, o, "" + v, E);
      if (typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case Il:
            return v.key === D ? f(m, o, v, E) : null;
          case nt:
            return v.key === D ? d(m, o, v, E) : null;
          case sl:
            return v = gu(v), r(m, o, v, E);
        }
        if (ul(v) || M(v))
          return D !== null ? null : g(m, o, v, E, null);
        if (typeof v.then == "function")
          return r(
            m,
            o,
            wn(v),
            E
          );
        if (v.$$typeof === _l)
          return r(
            m,
            o,
            Vn(m, v),
            E
          );
        $n(m, v);
      }
      return null;
    }
    function y(m, o, v, E, D) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return m = m.get(v) || null, c(o, m, "" + E, D);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case Il:
            return m = m.get(
              E.key === null ? v : E.key
            ) || null, f(o, m, E, D);
          case nt:
            return m = m.get(
              E.key === null ? v : E.key
            ) || null, d(o, m, E, D);
          case sl:
            return E = gu(E), y(
              m,
              o,
              v,
              E,
              D
            );
        }
        if (ul(E) || M(E))
          return m = m.get(v) || null, g(o, m, E, D, null);
        if (typeof E.then == "function")
          return y(
            m,
            o,
            v,
            wn(E),
            D
          );
        if (E.$$typeof === _l)
          return y(
            m,
            o,
            v,
            Vn(o, E),
            D
          );
        $n(o, E);
      }
      return null;
    }
    function O(m, o, v, E) {
      for (var D = null, ll = null, p = o, q = o = 0, Zl = null; p !== null && q < v.length; q++) {
        p.index > q ? (Zl = p, p = null) : Zl = p.sibling;
        var cl = r(
          m,
          p,
          v[q],
          E
        );
        if (cl === null) {
          p === null && (p = Zl);
          break;
        }
        l && p && cl.alternate === null && t(m, p), o = n(cl, o, q), ll === null ? D = cl : ll.sibling = cl, ll = cl, p = Zl;
      }
      if (q === v.length)
        return a(m, p), w && ba(m, q), D;
      if (p === null) {
        for (; q < v.length; q++)
          p = z(m, v[q], E), p !== null && (o = n(
            p,
            o,
            q
          ), ll === null ? D = p : ll.sibling = p, ll = p);
        return w && ba(m, q), D;
      }
      for (p = u(p); q < v.length; q++)
        Zl = y(
          p,
          m,
          q,
          v[q],
          E
        ), Zl !== null && (l && (cl = Zl.alternate, cl !== null && p.delete(cl.key === null ? q : cl.key)), o = n(
          Zl,
          o,
          q
        ), ll === null ? D = Zl : ll.sibling = Zl, ll = Zl);
      return l && p.forEach(function(au) {
        return t(m, au);
      }), w && ba(m, q), D;
    }
    function C(m, o, v, E) {
      if (v == null) throw Error(h(151));
      for (var D = null, ll = null, p = o, q = o = 0, Zl = null, cl = v.next(); p !== null && !cl.done; q++, cl = v.next()) {
        p.index > q ? (Zl = p, p = null) : Zl = p.sibling;
        var au = r(m, p, cl.value, E);
        if (au === null) {
          p === null && (p = Zl);
          break;
        }
        l && p && au.alternate === null && t(m, p), o = n(au, o, q), ll === null ? D = au : ll.sibling = au, ll = au, p = Zl;
      }
      if (cl.done)
        return a(m, p), w && ba(m, q), D;
      if (p === null) {
        for (; !cl.done; q++, cl = v.next())
          cl = z(m, cl.value, E), cl !== null && (o = n(cl, o, q), ll === null ? D = cl : ll.sibling = cl, ll = cl);
        return w && ba(m, q), D;
      }
      for (p = u(p); !cl.done; q++, cl = v.next())
        cl = y(p, m, q, cl.value, E), cl !== null && (l && (Zl = cl.alternate, Zl !== null && p.delete(
          Zl.key === null ? q : Zl.key
        )), o = n(cl, o, q), ll === null ? D = cl : ll.sibling = cl, ll = cl);
      return l && p.forEach(function(ih) {
        return t(m, ih);
      }), w && ba(m, q), D;
    }
    function K(m, o, v, E) {
      if (typeof v == "object" && v !== null && v.type === it && v.key === null && v.props.ref === void 0 && (v = v.props.children), typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case Il:
            l: {
              for (var D = v.key; o !== null; ) {
                if (o.key === D) {
                  if (D = v.type, D === it) {
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
                  } else if (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === sl && gu(D) === o.type) {
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
              ), qa(E, v), E.return = m, m = E) : (E = qn(
                v.type,
                v.key,
                v.props,
                null,
                m.mode,
                E
              ), qa(E, v), E.return = m, m = E);
            }
            return i(m);
          case nt:
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
              E = zc(v, m.mode, E), E.return = m, m = E;
            }
            return i(m);
          case sl:
            return v = gu(v), K(
              m,
              o,
              v,
              E
            );
        }
        if (ul(v))
          return O(
            m,
            o,
            v,
            E
          );
        if (M(v)) {
          if (D = M(v), typeof D != "function") throw Error(h(150));
          return v = D.call(v), C(
            m,
            o,
            v,
            E
          );
        }
        if (typeof v.then == "function")
          return K(
            m,
            o,
            wn(v),
            E
          );
        if (v.$$typeof === _l)
          return K(
            m,
            o,
            Vn(m, v),
            E
          );
        $n(m, v);
      }
      return typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint" ? (v = "" + v, o !== null && o.tag === 6 ? (a(m, o.sibling), E = e(o, v), E.return = m, m = E) : (a(m, o), E = Ec(v, m.mode, E), E.return = m, m = E), i(m)) : a(m, o);
    }
    return function(m, o, v, E) {
      try {
        Ge = 0;
        var D = K(
          m,
          o,
          v,
          E
        );
        return wu = null, D;
      } catch (p) {
        if (p === Ju || p === Kn) throw p;
        var ll = gt(29, p, null, m.mode);
        return ll.lanes = E, ll.return = m, ll;
      }
    };
  }
  var bu = Is(!0), ks = Is(!1), Ya = !1;
  function pc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function jc(l, t) {
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
    if (u = u.shared, (ml & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Bn(l), xs(l, null, a), t;
    }
    return xn(l, u, t, a), Bn(l);
  }
  function Xe(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Go(l, a);
    }
  }
  function Hc(l, t) {
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
  var xc = !1;
  function Qe() {
    if (xc) {
      var l = Ku;
      if (l !== null) throw l;
    }
  }
  function Ze(l, t, a, u) {
    xc = !1;
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
        if (y ? (P & r) === r : (u & r) === r) {
          r !== 0 && r === yu && (xc = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var O = l, C = c;
            r = t;
            var K = a;
            switch (C.tag) {
              case 1:
                if (O = C.payload, typeof O == "function") {
                  z = O.call(K, z, r);
                  break l;
                }
                z = O;
                break l;
              case 3:
                O.flags = O.flags & -65537 | 128;
              case 0:
                if (O = C.payload, r = typeof O == "function" ? O.call(K, z, r) : O, r == null) break l;
                z = Z({}, z, r);
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
  var Qa = Bt(null), Fn = Bt(0);
  function tr(l, t) {
    l = Aa, vl(Fn, l), vl(Qa, t), Aa = l | t.baseLanes;
  }
  function Bc() {
    vl(Fn, Aa), vl(Qa, Qa.current);
  }
  function qc() {
    Aa = Fn.current, Bl(Qa), Bl(Fn);
  }
  var lt = Bt(null), ft = null;
  function Za(l) {
    var t = l.alternate;
    vl(tt, tt.current & 1), vl(lt, l), ft === null && (t === null || Qa.current !== null || t.memoizedState !== null) && (ft = l);
  }
  function Yc(l) {
    vl(tt, tt.current), vl(lt, l), ft === null && (ft = l);
  }
  function ar(l) {
    l.tag === 22 ? (vl(tt, tt.current), vl(lt, l), ft === null && (ft = l)) : Va();
  }
  function Va() {
    vl(tt, tt.current), vl(lt, lt.current);
  }
  function Ct(l) {
    Bl(lt), ft === l && (ft = null), Bl(tt);
  }
  var tt = Bt(0);
  function Ve(l, t) {
    vl(lt, lt.current), vl(tt, t);
  }
  function Gc(l) {
    Bl(tt), Bl(lt), ft === l && (ft = null);
  }
  function Wn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || fo(a) || oo(a)))
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
  var za = 0, L = null, El = null, Xl = null, In = !1, $u = !1, Tu = !1, kn = 0, Le = 0, Fu = null, Dv = 0;
  function jl() {
    throw Error(h(321));
  }
  function Xc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!Mt(l[a], t[a])) return !1;
    return !0;
  }
  function Qc(l, t, a, u, e, n) {
    return za = n, L = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, U.H = l === null || l.memoizedState === null ? Gr : Xr, Tu = !1, n = a(u, e), Tu = !1, $u && (n = er(
      t,
      a,
      u,
      e
    )), ur(l), n;
  }
  function ur(l) {
    U.H = ni;
    var t = El !== null && El.next !== null;
    if (za = 0, Xl = El = L = null, In = !1, Le = 0, Fu = null, t) throw Error(h(300));
    l === null || Ql || (l = l.dependencies, l !== null && Zn(l) && (Ql = !0));
  }
  function er(l, t, a, u) {
    L = l;
    var e = 0;
    do {
      if ($u && (Fu = null), Le = 0, $u = !1, 25 <= e) throw Error(h(301));
      if (e += 1, Xl = El = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      U.H = xv, n = t(a, u);
    } while ($u);
    return n;
  }
  function Mv() {
    var l = U.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Ke(t) : t, l = l.useState()[0], (El !== null ? El.memoizedState : null) !== l && (L.flags |= 1024), t;
  }
  function Zc() {
    var l = kn !== 0;
    return kn = 0, l;
  }
  function Vc(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function Lc(l) {
    if (In) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      In = !1;
    }
    za = 0, Xl = El = L = null, $u = !1, Le = kn = 0, Fu = null;
  }
  function mt() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Xl === null ? L.memoizedState = Xl = l : Xl = Xl.next = l, Xl;
  }
  function ql() {
    if (El === null) {
      var l = L.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = El.next;
    var t = Xl === null ? L.memoizedState : Xl.next;
    if (t !== null)
      Xl = t, El = l;
    else {
      if (l === null)
        throw L.alternate === null ? Error(h(467)) : Error(h(310));
      El = l, l = {
        memoizedState: El.memoizedState,
        baseState: El.baseState,
        baseQueue: El.baseQueue,
        queue: El.queue,
        next: null
      }, Xl === null ? L.memoizedState = Xl = l : Xl = Xl.next = l;
    }
    return Xl;
  }
  function Pn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Ke(l) {
    var t = Le;
    return Le += 1, Fu === null && (Fu = []), l = $s(Fu, l, t), t = L, (Xl === null ? t.memoizedState : Xl.next) === null && (t = t.alternate, U.H = t === null || t.memoizedState === null ? Gr : Xr), l;
  }
  function li(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Ke(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === _l) return Pl(l);
    }
    throw Error(h(438, String(l)));
  }
  function Kc(l) {
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
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = Pn(), L.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = Jl;
    return t.index++, a;
  }
  function _a(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function ti(l) {
    var t = ql();
    return Jc(t, El, l);
  }
  function Jc(l, t, a) {
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
        if (z !== d.lane ? (P & z) === z : (za & z) === z) {
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
            }), z === yu && (g = !0);
          else if ((za & r) === r) {
            d = d.next, r === yu && (g = !0);
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
            }, f === null ? (c = f = z, i = n) : f = f.next = z, L.lanes |= r, wa |= r;
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
          }, f === null ? (c = f = r, i = n) : f = f.next = r, L.lanes |= z, wa |= z;
        d = d.next;
      } while (d !== null && d !== t);
      if (f === null ? i = n : f.next = c, !Mt(n, l.memoizedState) && (Ql = !0, g && (a = Ku, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function wc(l) {
    var t = ql(), a = t.queue;
    if (a === null) throw Error(h(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      Mt(n, t.memoizedState) || (Ql = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function nr(l, t, a) {
    var u = L, e = ql(), n = w;
    if (n) {
      if (a === void 0) throw Error(h(407));
      a = a();
    } else a = t();
    var i = !Mt(
      (El || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, Ql = !0), e = e.queue, Wc(fr.bind(null, u, e, l), [
      l
    ]), l = e.getSnapshot !== t || i || Xl !== null && (Xl.memoizedState.tag & 1) !== 0, Wu(
      l ? 9 : 8,
      { destroy: void 0 },
      cr.bind(null, u, e, a, t),
      null
    ), l) {
      if (u.flags |= 2048, zl === null) throw Error(h(349));
      n || (za & 127) !== 0 || ir(u, t, a);
    }
    return a;
  }
  function ir(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = L.updateQueue, t === null ? (t = Pn(), L.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
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
      return !Mt(l, a);
    } catch {
      return !0;
    }
  }
  function sr(l) {
    var t = ou(l, 2);
    t !== null && Et(t, l, 2);
  }
  function $c(l) {
    var t = mt();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), Tu) {
        Ua(!0);
        try {
          a();
        } finally {
          Ua(!1);
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
  function rr(l, t, a, u) {
    return l.baseState = a, Jc(
      l,
      El,
      typeof u == "function" ? u : _a
    );
  }
  function Cv(l, t, a, u, e) {
    if (ei(l)) throw Error(h(485));
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
      U.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, mr(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function mr(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = U.T, i = {};
      i.types = n !== null ? n.types : null, U.T = i;
      try {
        var c = a(e, u), f = U.S;
        f !== null && f(i, c), dr(l, t, c);
      } catch (d) {
        Fc(l, t, d);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), U.T = n;
      }
    } else
      try {
        n = a(e, u), dr(l, t, n);
      } catch (d) {
        Fc(l, t, d);
      }
  }
  function dr(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        vr(l, t, u);
      },
      function(u) {
        return Fc(l, t, u);
      }
    ) : vr(l, t, a);
  }
  function vr(l, t, a) {
    t.status = "fulfilled", t.value = a, yr(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, mr(l, a)));
  }
  function Fc(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, yr(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function yr(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function hr(l, t) {
    return t;
  }
  function gr(l, t) {
    if (w) {
      var a = zl.formState;
      if (a !== null) {
        l: {
          var u = L;
          if (w) {
            if (Ol) {
              t: {
                for (var e = Ol, n = Zt; e.nodeType !== 8; ) {
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
                Ol = Lt(
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
    return a = mt(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: hr,
      lastRenderedState: t
    }, a.queue = u, a = Br.bind(
      null,
      L,
      u
    ), u.dispatch = a, u = $c(!1), n = tf.bind(
      null,
      L,
      !1,
      u.queue
    ), u = mt(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = Cv.bind(
      null,
      L,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function Sr(l) {
    var t = ql();
    return br(t, El, l);
  }
  function br(l, t, a) {
    if (t = Jc(
      l,
      t,
      hr
    )[0], l = ti(_a)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = Ke(t);
      } catch (i) {
        throw i === Ju ? Kn : i;
      }
    else u = t;
    t = ql();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (L.flags |= 2048, Wu(
      9,
      { destroy: void 0 },
      Uv.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Uv(l, t) {
    l.action = t;
  }
  function Tr(l) {
    var t = ql(), a = El;
    if (a !== null)
      return br(t, a, l);
    ql(), t = t.memoizedState, a = ql();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function Wu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = L.updateQueue, t === null && (t = Pn(), L.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function Er() {
    return ql().memoizedState;
  }
  function ai(l, t, a, u) {
    var e = mt();
    L.flags |= l, e.memoizedState = Wu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function ui(l, t, a, u) {
    var e = ql();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    El !== null && u !== null && Xc(u, El.memoizedState.deps) ? e.memoizedState = Wu(t, n, a, u) : (L.flags |= l, e.memoizedState = Wu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function zr(l, t) {
    ai(8390656, 8, l, t);
  }
  function Wc(l, t) {
    ui(2048, 8, l, t);
  }
  function Rv(l) {
    L.flags |= 4;
    var t = L.updateQueue;
    if (t === null)
      t = Pn(), L.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function _r(l) {
    var t = ql().memoizedState;
    return Rv({ ref: t, nextImpl: l }), function() {
      if ((ml & 2) !== 0) throw Error(h(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function Or(l, t) {
    return ui(4, 2, l, t);
  }
  function Nr(l, t) {
    return ui(4, 4, l, t);
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
  function Dr(l, t, a) {
    a = a != null ? a.concat([l]) : null, ui(4, 4, Ar.bind(null, t, l), a);
  }
  function Ic() {
  }
  function Mr(l, t) {
    var a = ql();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Xc(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function Cr(l, t) {
    var a = ql();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Xc(t, u[1]))
      return u[0];
    if (u = l(), Tu) {
      Ua(!0);
      try {
        l();
      } finally {
        Ua(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function kc(l, t, a) {
    return a === void 0 || (za & 1073741824) !== 0 && (P & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = G0(), L.lanes |= l, wa |= l, a);
  }
  function Ur(l, t, a, u) {
    return Mt(a, t) ? a : Qa.current !== null ? (l = kc(l, a, u), Mt(l, t) || (Ql = !0), l) : (za & 106) === 0 || (za & 1073741824) !== 0 && (P & 261930) === 0 ? (Ql = !0, l.memoizedState = a) : (l = G0(), L.lanes |= l, wa |= l, t);
  }
  function Rr(l, t, a, u, e) {
    var n = Y.p;
    Y.p = n !== 0 && 8 > n ? n : 8;
    var i = U.T, c = {};
    c.types = i !== null ? i.types : null, U.T = c, tf(l, !1, t, a);
    try {
      var f = e(), d = U.S;
      if (d !== null && d(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var g = Av(
          f,
          u
        );
        Je(
          l,
          t,
          g,
          jt(l)
        );
      } else
        Je(
          l,
          t,
          u,
          jt(l)
        );
    } catch (z) {
      Je(
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
  function Pc(l, t, a, u) {
    if (l.tag !== 5) throw Error(h(476));
    var e = pr(l).queue;
    Rr(
      l,
      e,
      t,
      xt,
      a === null ? pv : function() {
        return jr(l), a(u);
      }
    );
  }
  function pr(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: xt,
      baseState: xt,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: _a,
        lastRenderedState: xt
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
  function jr(l) {
    var t = pr(l);
    t.next === null && (t = l.alternate.memoizedState), Je(
      l,
      t.next.queue,
      {},
      jt()
    );
  }
  function lf() {
    return Pl(ye);
  }
  function Hr() {
    return ql().memoizedState;
  }
  function xr() {
    return ql().memoizedState;
  }
  function jv(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = jt();
          l = Ga(a);
          var u = Xa(t, l, a);
          u !== null && (Et(u, t, a), Xe(u, t, a)), t = { cache: Mc() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Hv(l, t, a) {
    var u = jt();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ei(l) ? qr(t, a) : (a = bc(l, t, a, u), a !== null && (Et(a, l, u), Yr(a, t, u)));
  }
  function Br(l, t, a) {
    var u = jt();
    Je(l, t, a, u);
  }
  function Je(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (ei(l)) qr(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, Mt(c, i))
            return xn(l, t, e, 0), zl === null && Hn(), !1;
        } catch {
        }
      if (a = bc(l, t, e, u), a !== null)
        return Et(a, l, u), Yr(a, t, u), !0;
    }
    return !1;
  }
  function tf(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: Jf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ei(l)) {
      if (t) throw Error(h(479));
    } else
      t = bc(
        l,
        a,
        u,
        2
      ), t !== null && Et(t, l, 2);
  }
  function ei(l) {
    var t = l.alternate;
    return l === L || t !== null && t === L;
  }
  function qr(l, t) {
    $u = In = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function Yr(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Go(l, a);
    }
  }
  var ni = {
    readContext: Pl,
    use: li,
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
    use: li,
    useCallback: function(l, t) {
      return mt().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Pl,
    useEffect: zr,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, ai(
        4194308,
        4,
        Ar.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return ai(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      ai(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = mt();
      t = t === void 0 ? null : t;
      var u = l();
      if (Tu) {
        Ua(!0);
        try {
          l();
        } finally {
          Ua(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = mt();
      if (a !== void 0) {
        var e = a(t);
        if (Tu) {
          Ua(!0);
          try {
            a(t);
          } finally {
            Ua(!1);
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
        L,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = mt();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = $c(l);
      var t = l.queue, a = Br.bind(null, L, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: Ic,
    useDeferredValue: function(l, t) {
      var a = mt();
      return kc(a, l, t);
    },
    useTransition: function() {
      var l = $c(!1);
      return l = Rr.bind(
        null,
        L,
        l.queue,
        !0,
        !1
      ), mt().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = L, e = mt();
      if (w) {
        if (a === void 0)
          throw Error(h(407));
        a = a();
      } else {
        if (a = t(), zl === null)
          throw Error(h(349));
        (P & 127) !== 0 || ir(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, zr(fr.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, Wu(
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
      var l = mt(), t = zl.identifierPrefix;
      if (w) {
        var a = ea, u = ua;
        a = (u & ~(1 << 32 - At(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = kn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Dv++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: lf,
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
      return t.queue = a, t = tf.bind(
        null,
        L,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: Kc,
    useCacheRefresh: function() {
      return mt().memoizedState = jv.bind(
        null,
        L
      );
    },
    useEffectEvent: function(l) {
      var t = mt(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((ml & 2) !== 0)
          throw Error(h(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, Xr = {
    readContext: Pl,
    use: li,
    useCallback: Mr,
    useContext: Pl,
    useEffect: Wc,
    useImperativeHandle: Dr,
    useInsertionEffect: Or,
    useLayoutEffect: Nr,
    useMemo: Cr,
    useReducer: ti,
    useRef: Er,
    useState: function() {
      return ti(_a);
    },
    useDebugValue: Ic,
    useDeferredValue: function(l, t) {
      var a = ql();
      return Ur(
        a,
        El.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = ti(_a)[0], t = ql().memoizedState;
      return [
        typeof l == "boolean" ? l : Ke(l),
        t
      ];
    },
    useSyncExternalStore: nr,
    useId: Hr,
    useHostTransitionStatus: lf,
    useFormState: Sr,
    useActionState: Sr,
    useOptimistic: function(l, t) {
      var a = ql();
      return rr(a, El, l, t);
    },
    useMemoCache: Kc,
    useCacheRefresh: xr,
    useEffectEvent: _r
  }, xv = {
    readContext: Pl,
    use: li,
    useCallback: Mr,
    useContext: Pl,
    useEffect: Wc,
    useImperativeHandle: Dr,
    useInsertionEffect: Or,
    useLayoutEffect: Nr,
    useMemo: Cr,
    useReducer: wc,
    useRef: Er,
    useState: function() {
      return wc(_a);
    },
    useDebugValue: Ic,
    useDeferredValue: function(l, t) {
      var a = ql();
      return El === null ? kc(a, l, t) : Ur(
        a,
        El.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = wc(_a)[0], t = ql().memoizedState;
      return [
        typeof l == "boolean" ? l : Ke(l),
        t
      ];
    },
    useSyncExternalStore: nr,
    useId: Hr,
    useHostTransitionStatus: lf,
    useFormState: Tr,
    useActionState: Tr,
    useOptimistic: function(l, t) {
      var a = ql();
      return El !== null ? rr(a, El, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: Kc,
    useCacheRefresh: xr,
    useEffectEvent: _r
  };
  function af(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : Z({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var uf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = jt(), e = Ga(u);
      e.payload = t, a != null && (e.callback = a), t = Xa(l, e, u), t !== null && (Et(t, l, u), Xe(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = jt(), e = Ga(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = Xa(l, e, u), t !== null && (Et(t, l, u), Xe(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = jt(), u = Ga(a);
      u.tag = 2, t != null && (u.callback = t), t = Xa(l, u, a), t !== null && (Et(t, l, a), Xe(t, l, a));
    }
  };
  function Qr(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !pe(a, u) || !pe(e, n) : !0;
  }
  function Zr(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && uf.enqueueReplaceState(t, t.state, null);
  }
  function Eu(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = Z({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function Vr(l) {
    jn(l);
  }
  function Lr(l) {
    console.error(l);
  }
  function Kr(l) {
    jn(l);
  }
  function ii(l, t) {
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
  function ef(l, t, a) {
    return a = Ga(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      ii(l, t);
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
            return ft === null ? Di() : a.alternate === null && Hl === 0 && (Hl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Jn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Vf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === Jn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Vf(l, u, e)), !1;
        }
        throw Error(h(435, a.tag));
      }
      return Vf(l, u, e), Di(), !1;
    }
    if (w)
      return t = lt.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Oc && (l = Error(h(422), { cause: u }), xe(Gt(l, a)))) : (u !== Oc && (t = Error(h(423), {
        cause: u
      }), xe(
        Gt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = Gt(u, a), e = ef(
        l.stateNode,
        u,
        e
      ), Hc(l, e), Hl !== 4 && (Hl = 2)), !1;
    var n = Error(h(520), { cause: u });
    if (n = Gt(n, a), ln === null ? ln = [n] : ln.push(n), Hl !== 4 && (Hl = 2), t === null) return !0;
    u = Gt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = ef(a.stateNode, u, l), Hc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && ($a === null || !$a.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = wr(e), $r(
              e,
              l,
              a,
              u
            ), Hc(a, e), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var nf = Error(h(461)), Ql = !1;
  function Vl(l, t, a, u) {
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
    return vu(t), u = Qc(
      l,
      t,
      a,
      i,
      n,
      e
    ), c = Zc(), l !== null && !Ql ? (Vc(l, t, e), Oa(l, t, e)) : (w && c && Gn(t), t.flags |= 1, Vl(l, t, u, e), t.child);
  }
  function Wr(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Tc(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, Ir(
        l,
        t,
        n,
        u,
        e
      )) : (l = qn(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !vf(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : pe, a(i, u) && l.ref === t.ref)
        return Oa(l, t, e);
    }
    return t.flags |= 1, l = Sa(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function Ir(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (pe(n, u) && l.ref === t.ref)
        if (Ql = !1, t.pendingProps = u = n, vf(l, e))
          (l.flags & 131072) !== 0 && (Ql = !0);
        else
          return t.lanes = l.lanes, Oa(l, t, e);
    }
    return cf(
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
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && Ln(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? tr(t, n) : Bc(), ar(t);
      else
        return u = t.lanes = 536870912, Pr(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (Ln(t, n.cachePool), tr(t, n), Va(), t.memoizedState = null) : (l !== null && Ln(t, null), Bc(), Va());
    return Vl(l, t, e, a), t.child;
  }
  function we(l, t) {
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
    }, l !== null && Ln(t, null), Bc(), ar(t), l !== null && du(l, t, u, !0), t.childLanes = e, null;
  }
  function ci(l, t) {
    return t = fi(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function l0(l, t, a) {
    return bu(t, l.child, null, a), l = ci(t, t.pendingProps), l.flags |= 2, Ct(t), t.memoizedState = null, l;
  }
  function qv(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (w) {
        if (u.mode === "hidden")
          return l = ci(t, u), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, we(null, l);
        if (Yc(t), (l = Ol) ? (l = Am(
          l,
          Zt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: ja !== null ? { id: ua, overflow: ea } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = qs(l), a.return = t, t.child = a, $l = t, Ol = null)) : l = null, l === null) throw xa(t);
        return t.lanes = 536870912, null;
      }
      return ci(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Yc(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = l0(
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
            throw n.retryLane = i, ou(l, i), Et(u, l, i), nf;
          Di();
        }
        t = l0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, Ol = Lt(i.nextSibling), $l = t, w = !0, Ha = null, Zt = !1, l !== null && Xs(t, l), t = ci(t, u), t.flags |= 134221824;
      return t;
    }
    return l = Sa(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function Iu(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(h(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function cf(l, t, a, u, e) {
    return vu(t), a = Qc(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = Zc(), l !== null && !Ql ? (Vc(l, t, e), Oa(l, t, e)) : (w && u && Gn(t), t.flags |= 1, Vl(l, t, a, e), t.child);
  }
  function t0(l, t, a, u, e, n) {
    return vu(t), t.updateQueue = null, a = er(
      t,
      u,
      a,
      e
    ), ur(l), u = Zc(), l !== null && !Ql ? (Vc(l, t, n), Oa(l, t, n)) : (w && u && Gn(t), t.flags |= 1, Vl(l, t, a, n), t.child);
  }
  function a0(l, t, a, u, e) {
    if (vu(t), t.stateNode === null) {
      var n = Qu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Pl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = uf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, pc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Pl(i) : Qu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (af(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && uf.enqueueReplaceState(n, n.state, null), Ze(t, u, n, e), Qe(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = Eu(a, c);
      n.props = f;
      var d = n.context, g = a.contextType;
      i = Qu, typeof g == "object" && g !== null && (i = Pl(g));
      var z = a.getDerivedStateFromProps;
      g = typeof z == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || d !== i) && Zr(
        t,
        n,
        u,
        i
      ), Ya = !1;
      var r = t.memoizedState;
      n.state = r, Ze(t, u, n, e), Qe(), d = t.memoizedState, c || r !== d || Ya ? (typeof z == "function" && (af(
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
      n = t.stateNode, jc(l, t), i = t.memoizedProps, g = Eu(a, i), n.props = g, z = t.pendingProps, r = n.context, d = a.contextType, f = Qu, typeof d == "object" && d !== null && (f = Pl(d)), c = a.getDerivedStateFromProps, (d = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== z || r !== f) && Zr(
        t,
        n,
        u,
        f
      ), Ya = !1, r = t.memoizedState, n.state = r, Ze(t, u, n, e), Qe();
      var y = t.memoizedState;
      i !== z || r !== y || Ya || l !== null && l.dependencies !== null && Zn(l.dependencies) ? (typeof c == "function" && (af(
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
    return n = u, Iu(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = bu(
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
  function u0(l, t, a, u) {
    return ru(), t.flags |= 256, Vl(l, t, a, u), t.child;
  }
  var ff = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function of(l) {
    return { baseLanes: l, cachePool: Js() };
  }
  function sf(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= pt), l;
  }
  function e0(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (tt.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (w) {
        if (e ? Za(t) : Va(), (l = Ol) ? (l = Am(
          l,
          Zt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: ja !== null ? { id: ua, overflow: ea } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = qs(l), a.return = t, t.child = a, $l = t, Ol = null)) : l = null, l === null) throw xa(t);
        return oo(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = u.children, u = u.fallback, e ? (Va(), e = t.mode, n = fi(
        { mode: "hidden", children: n },
        e
      ), u = su(
        u,
        e,
        a,
        null
      ), n.return = t, u.return = t, n.sibling = u, t.child = n, u = t.child, u.memoizedState = of(a), u.childLanes = sf(
        l,
        i,
        a
      ), t.memoizedState = ff, we(null, u)) : (Za(t), rf(t, n));
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
    return e ? (Va(), e = u.fallback, n = t.mode, c = l.child, f = c.sibling, u = Sa(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? e = Sa(f, e) : (e = su(
      e,
      n,
      a,
      null
    ), e.flags |= 2), e.return = t, u.return = t, u.sibling = e, t.child = u, we(null, u), u = t.child, e = l.child.memoizedState, e === null ? e = of(a) : (n = e.cachePool, n !== null ? (c = Gl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Js(), e = {
      baseLanes: e.baseLanes | a,
      cachePool: n
    }), u.memoizedState = e, u.childLanes = sf(
      l,
      i,
      a
    ), t.memoizedState = ff, we(l.child, u)) : (Za(t), a = l.child, l = a.sibling, a = Sa(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function rf(l, t) {
    return t = fi(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function fi(l, t) {
    return l = gt(22, l, null, t), l.lanes = 0, l;
  }
  function oi(l, t, a) {
    return bu(t, l.child, null, a), l = rf(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Yv(l, t, a, u, e, n, i, c) {
    if (a)
      return t.flags & 256 ? (Za(t), t.flags &= -257, oi(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Va(), t.child = l.child, t.flags |= 128, null) : (Va(), n = e.fallback, i = t.mode, e = fi(
        { mode: "visible", children: e.children },
        i
      ), n = su(
        n,
        i,
        c,
        null
      ), n.flags |= 2, e.return = t, n.return = t, e.sibling = n, t.child = e, bu(t, l.child, null, c), e = t.child, e.memoizedState = of(c), e.childLanes = sf(
        l,
        u,
        c
      ), t.memoizedState = ff, we(null, e));
    if (Za(t), oo(n)) {
      if (u = n.nextSibling && n.nextSibling.dataset, u) var f = u.dgst;
      return u = f, u !== "" && (e = Error(h(419)), e.stack = "", e.digest = u, xe({ value: e, source: null, stack: null })), oi(
        l,
        t,
        c
      );
    }
    if (Ql || du(l, t, c, !1), u = (c & l.childLanes) !== 0, Ql || u) {
      if (Qa.current !== null)
        return oi(
          l,
          t,
          c
        );
      if (u = zl, u !== null && (e = Xo(
        u,
        c
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, ou(l, e), Et(u, l, e), nf;
      return fo(n) || Di(), oi(
        l,
        t,
        c
      );
    }
    return fo(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, Ol = Lt(n.nextSibling), $l = t, w = !0, Ha = null, Zt = !1, l !== null && Xs(t, l), t = rf(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function n0(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Qn(l.return, t, a);
  }
  function i0(l) {
    for (var t = null; l !== null; ) {
      var a = l.alternate;
      a !== null && Wn(a) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function si(l, t, a, u, e, n) {
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
  function mf(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var a = t.sibling;
      t.sibling = l.child, l.child = t, t = a;
    }
  }
  function df(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = tt.current;
    if (t.flags & 128)
      return Ve(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, Ve(t, i), e === "backwards" && l !== null ? (mf(l), Vl(l, t, u, a), mf(l)) : Vl(l, t, u, a), u = w ? He : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && n0(l, a, t);
        else if (l.tag === 19)
          n0(l, a, t);
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
        a = i0(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null, mf(t)), si(
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
          if (l = e.alternate, l !== null && Wn(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        si(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        si(
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
        a = i0(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), si(
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
  function c0(l, t, a) {
    var u = t.pendingProps;
    return Ba(t, t.type, u.value), Vl(l, t, u.children, a), t.child;
  }
  function Oa(l, t, a) {
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
      for (l = t.child, a = Sa(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = Sa(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function vf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && Zn(l)));
  }
  function Gv(l, t, a) {
    switch (t.tag) {
      case 3:
        uu(t, t.stateNode.containerInfo), Ba(t, Gl, l.memoizedState.cache), ru();
        break;
      case 27:
      case 5:
        Du(t);
        break;
      case 4:
        uu(t, t.stateNode.containerInfo);
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
          return t.flags |= 128, Yc(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null) {
          if (u.dehydrated !== null)
            return Za(t), t.flags |= 128, null;
          u = du(
            l,
            t,
            a,
            !1
          );
          var e = t.child.childLanes;
          return u || (a & e) !== 0 ? e0(l, t, a) : (Za(t), l = Oa(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        Za(t);
        break;
      case 19:
        if (t.flags & 128)
          return df(
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
            return df(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), Ve(t, tt.current), u) break;
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
    return Oa(l, t, a);
  }
  function f0(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Ql = !0;
      else {
        if (!vf(l, a) && (t.flags & 128) === 0)
          return Ql = !1, Gv(
            l,
            t,
            a
          );
        Ql = (l.flags & 131072) !== 0;
      }
    else
      Ql = !1, w && (t.flags & 1048576) !== 0 && Gs(t, He, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = gu(t.elementType), t.type = l, typeof l == "function")
            Tc(l) ? (u = Eu(l, u), t.tag = 1, t = a0(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = cf(
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
              } else if (e === k) {
                t.tag = 14, t = Wr(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === _l) {
                t.tag = 10, t.type = l, t = c0(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = F(l) || l, Error(h(306, t, ""));
          }
        }
        return t;
      case 0:
        return cf(
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
        ), a0(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (uu(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(h(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, jc(l, t), Ze(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, Ba(t, Gl, u), u !== n.cache && Dc(
            t,
            [Gl],
            a,
            !0
          ), Qe(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = u0(
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
              ), xe(e), t = u0(
                l,
                t,
                u,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, Ol = Lt(l.firstChild), $l = t, w = !0, Ha = null, Zt = !0, a = ks(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (ru(), u === e) {
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
        return Iu(l, t), l === null ? (a = jm(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : w || (t.stateNode = mm(
          t.type,
          t.pendingProps,
          la.current,
          t
        )) : t.memoizedState = jm(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return Du(t), l === null && w && (u = t.stateNode = Cm(
          t.type,
          t.pendingProps,
          la.current
        ), $l = t, Zt = !0, e = Ol, Ia(t.type) ? (so = e, Ol = Lt(u.firstChild)) : Ol = e), Vl(
          l,
          t,
          t.pendingProps.children,
          a
        ), Iu(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && w && ((e = u = Ol) && (u = jy(
          u,
          t.type,
          t.pendingProps,
          Zt
        ), u !== null ? (t.stateNode = u, $l = t, Ol = Lt(u.firstChild), Zt = !1, e = !0) : e = !1), e || xa(t)), Du(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, to(e, n) ? u = null : i !== null && to(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Qc(
          l,
          t,
          Mv,
          null,
          null,
          a
        ), ye._currentValue = e), Iu(l, t), Vl(l, t, u, a), t.child;
      case 6:
        return l === null && w && ((l = a = Ol) && (a = Hy(
          a,
          t.pendingProps,
          Zt
        ), a !== null ? (t.stateNode = a, $l = t, Ol = null, l = !0) : l = !1), l || xa(t)), null;
      case 13:
        return e0(l, t, a);
      case 4:
        return uu(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = bu(
          t,
          null,
          u,
          a
        ) : Vl(l, t, u, a), t.child;
      case 11:
        return Fr(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return u = t.pendingProps, Iu(l, t), Vl(l, t, u, a), t.child;
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
        return c0(l, t, a);
      case 9:
        return e = t.type._context, u = t.pendingProps.children, vu(t), e = Pl(e), u = u(e), t.flags |= 1, Vl(l, t, u, a), t.child;
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
        return df(l, t, a);
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
        return vu(t), u = Pl(Gl), l === null ? (e = Uc(), e === null && (e = zl, n = Mc(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, pc(t), Ba(t, Gl, e)) : ((l.lanes & a) !== 0 && (jc(l, t), Ze(t, null, null, a), Qe()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), Ba(t, Gl, u)) : (u = n.cache, Ba(t, Gl, u), u !== e.cache && Dc(
          t,
          [Gl],
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
        }), u = t.pendingProps, u.name != null && u.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : w && Gn(t), l !== null && l.memoizedProps.name !== u.name ? t.flags |= 4194816 : Iu(l, t), Vl(l, t, u.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(h(156, t.tag));
  }
  function Na(l) {
    l.flags |= 4;
  }
  function yf(l, t, a, u, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? qm(t, u) : qm(t, u) && (u.src !== a.src || u.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (V0()) l.flags |= 8192;
        else
          throw Su = Jn, Rc;
    } else l.flags &= -16777217;
  }
  function o0(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !Ym(t))
      if (V0()) l.flags |= 8192;
      else
        throw Su = Jn, Rc;
  }
  function ri(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? qo() : 536870912, l.lanes |= t, ae |= t);
  }
  function $e(l, t) {
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
    switch (_c(t), t.tag) {
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
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), Ea(Gl), Ca(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Lu(t) ? Na(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, Nc())), Nl(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Na(t), n !== null ? (Nl(t), o0(t, n)) : (Nl(t), yf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (Na(t), Nl(t), o0(t, n)) : (Nl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && Na(t), Nl(t), yf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (Mu(t), a = la.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Na(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return Nl(t), t.subtreeFlags &= -33554433, null;
          }
          l = _t.current, Lu(t) ? Qs(t) : (l = Cm(e, u, a), t.stateNode = l, Na(t));
        }
        return Nl(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (Mu(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Na(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return Nl(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = _t.current, Lu(t))
            Qs(t);
          else {
            var i = nn(
              la.current
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
            n[kl] = t, n[ht] = u;
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
            u && Na(t);
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
          l.memoizedProps !== u && Na(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(h(166));
          if (l = la.current, Lu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = $l, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[kl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || fm(l.nodeValue, a)), l || xa(t, !0);
          } else
            l = nn(l).createTextNode(
              u
            ), l[kl] = t, t.stateNode = l;
        }
        return Nl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Lu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(h(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(557));
              l[kl] = t;
            } else
              ru(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Nl(t), l = !1;
          } else
            a = Nc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (Ct(t), t) : (Ct(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(h(558));
        }
        return Nl(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = Lu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(h(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(h(317));
              e[kl] = t;
            } else
              ru(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Nl(t), e = !1;
          } else
            e = Nc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (Ct(t), t) : (Ct(t), null);
        }
        return Ct(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), ri(t, t.updateQueue), Nl(t), null);
      case 4:
        return Ca(), l === null && Wf(t.stateNode.containerInfo), t.flags |= 67108864, Nl(t), null;
      case 10:
        return Ea(t.type), Nl(t), null;
      case 19:
        if (Gc(t), u = t.memoizedState, u === null) return Nl(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) $e(u, !1);
          else {
            if (Hl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Wn(l), n !== null) {
                  for (t.flags |= 128, $e(u, !1), l = n.updateQueue, t.updateQueue = l, ri(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    Bs(a, l), a = a.sibling;
                  return Ve(
                    t,
                    tt.current & 1 | 2
                  ), w && ba(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Ot() > _i && (t.flags |= 128, e = !0, $e(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = Wn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, ri(t, l), $e(u, !0), u.tail === null && u.tailMode !== "collapsed" && u.tailMode !== "visible" && !n.alternate && !w)
                return Nl(t), null;
            } else
              2 * Ot() - u.renderingStartTime > _i && a !== 536870912 && (t.flags |= 128, e = !0, $e(u, !1), t.lanes = 4194304);
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
          return u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Ot(), l.sibling = null, n = tt.current, n = e ? n & 1 | 2 : n & 1, u.tailMode === "visible" || u.tailMode === "collapsed" || !a || w ? Ve(t, n) : (a = n, vl(lt, t), vl(tt, a), ft === null && (ft = t)), w && ba(t, u.treeForkCount), l;
        }
        return Nl(t), null;
      case 22:
      case 23:
        return Ct(t), qc(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Nl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Nl(t), a = t.updateQueue, a !== null && ri(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && Bl(hu), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Ea(Gl), Nl(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, Nl(t), null;
    }
    throw Error(h(156, t.tag));
  }
  function Qv(l, t) {
    switch (_c(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Ea(Gl), Ca(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return Mu(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Ct(t), t.alternate === null)
            throw Error(h(340));
          ru();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (Ct(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(h(340));
          ru();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return Gc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return Ca(), null;
      case 10:
        return Ea(t.type), null;
      case 22:
      case 23:
        return Ct(t), qc(), l !== null && Bl(hu), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Ea(Gl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function s0(l, t) {
    switch (_c(t), t.tag) {
      case 3:
        Ea(Gl), Ca();
        break;
      case 26:
      case 27:
      case 5:
        Mu(t);
        break;
      case 4:
        Ca();
        break;
      case 31:
        t.memoizedState !== null && Ct(t);
        break;
      case 13:
        Ct(t);
        break;
      case 19:
        Gc(t);
        break;
      case 10:
        Ea(t.type);
        break;
      case 22:
      case 23:
        Ct(t), qc(), l !== null && Bl(hu);
        break;
      case 24:
        Ea(Gl);
    }
  }
  function Fe(l, t) {
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
  function r0(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        lr(t, a);
      } catch (u) {
        hl(l, l.return, u);
      }
    }
  }
  function m0(l, t, a) {
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
  function na(l, t) {
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
            (e.ref === null || e.ref.name !== n) && (e.ref = bm(n)), u = e.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new Ht(l);
              T(
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
  function at(l, t) {
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
  function mi(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        Nm(
          l.stateNode,
          t[a]
        );
  }
  function d0(l) {
    for (var t = l.return; t !== null && (gf(t) && Nm(l.stateNode, t.stateNode), !hf(t)); )
      t = t.return;
  }
  function We(l) {
    for (var t = l.return; t !== null && (gf(t) && py(l.stateNode, t.stateNode), !hf(t)); )
      t = t.return;
  }
  function hf(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function gf(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function Sf(l) {
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
  function bf(l, t, a) {
    try {
      var u = l.stateNode;
      dy(u, l.type, a, t), u[ht] = t;
    } catch (e) {
      hl(l, l.return, e);
    }
  }
  function v0(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Ia(l.type) || l.tag === 4;
  }
  function Tf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || v0(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Ia(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Ef(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = aa)), mi(l, u), rl = !0;
    else if (e !== 4 && (e === 27 && (mi(l, u), u = null, Ia(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
      for (Ef(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        Ef(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function di(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e), mi(l, u), rl = !0;
    else if (e !== 4 && (e === 27 && (mi(l, u), u = null, Ia(l.type) && (a = l.stateNode)), l = l.child, l !== null))
      for (di(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        di(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function y0(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      ut(t, u, a), t[kl] = l, t[ht] = a;
    } catch (n) {
      hl(l, l.return, n);
    }
  }
  var vi = !1, Ut = null;
  function h0(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (vi = !0);
  }
  var ia = null;
  function g0() {
    var l = ia;
    return ia = null, l;
  }
  var St = 0;
  function ku(l, t, a, u, e) {
    return St = 0, S0(
      l.child,
      t,
      a,
      u,
      e
    );
  }
  function S0(l, t, a, u, e) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (u !== null) {
          var c = eo(i);
          u.push(c), c.view && (n = !0);
        } else
          n || eo(i).view && (n = !0);
        vi = !0, gm(
          i,
          St === 0 ? t : t + "_" + St,
          a
        ), St++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && e || S0(
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
  function ca(l, t) {
    for (; l !== null; )
      l.tag === 5 ? Sm(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || ca(
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
          t = ga(t.default, t.share), t !== "none" && (ku(
            l,
            a,
            t,
            null,
            !1
          ) || ca(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function zf(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, u = l.memoizedProps, e = ha(u, a), n = ga(
        u.default,
        a.paired ? u.share : u.enter
      );
      n !== "none" ? ku(l, e, n, null, !1) ? (yi(l), a.paired || t || ie(l, u.onEnter)) : ca(l.child, !1) : yi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        zf(l, t), l = l.sibling;
    else yi(l);
  }
  function _f(l) {
    if (Ut !== null && Ut.size !== 0) {
      var t = Ut;
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
                  if (n !== "none" && (ku(
                    l,
                    u,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, e.paired = n, n.paired = e, ie(l, a.onShare)) : ca(l.child, !1)), t.delete(u), t.size === 0) break;
                }
              }
            }
            _f(l);
          }
          l = l.sibling;
        }
    }
  }
  function Of(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, a = ha(t, l.stateNode), u = Ut !== null ? Ut.get(a) : void 0, e = ga(
        t.default,
        u !== void 0 ? t.share : t.exit
      );
      e !== "none" && (ku(l, a, e, null, !1) ? u !== void 0 ? (e = l.stateNode, u.paired = e, e.paired = u, Ut.delete(a), ie(l, t.onShare)) : ie(l, t.onExit) : ca(l.child, !1)), Ut !== null && _f(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Of(l), l = l.sibling;
    else
      Ut !== null && _f(l);
  }
  function b0(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = ha(t, l.stateNode);
        t = ga(t.default, t.update), l.flags &= -5, t !== "none" && ku(
          l,
          a,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && b0(l);
      l = l.sibling;
    }
  }
  function Nf(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, ca(l.child, !1));
          }
          Nf(l);
        }
        l = l.sibling;
      }
  }
  function hi(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, ca(l.child, !1), Nf(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        hi(l), l = l.sibling;
    else Nf(l);
  }
  function T0(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? ca(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && T0(l), l = l.sibling;
  }
  function Af(l, t, a, u, e, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var f = t.stateNode;
        if (n !== null && St < n.length) {
          var d = n[St], g = eo(f);
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
        (l.flags & 4) !== 0 && gm(
          f,
          St === 0 ? a : a + "_" + St,
          e
        ), c && (l.flags & 4) !== 0 || (ia === null && (ia = []), ia.push(
          f,
          St === 0 ? u : u + "_" + St,
          t.memoizedProps
        )), St++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : Af(
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
  function E0(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, u = l.stateNode, e = ha(a, u), n = ga(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, u = l;
        var c = l.child;
        St = 0, e = Af(
          u,
          c,
          e,
          e,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && e && ie(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && E0(l);
      l = l.sibling;
    }
  }
  var Fl = !1, dl = !1, fa = !1, Df = !1, z0 = typeof WeakSet == "function" ? WeakSet : Set, Wl = null, oa = !1, Ie = !1, gi = !1, Mf = !1;
  function Zv(l, t, a) {
    if (l = l.containerInfo, Pf = he, l = As(l), dc(l)) {
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
              for (var O; r !== u || n !== 0 && r.nodeType !== 3 || (f = c + n), r !== i || e !== 0 && r.nodeType !== 3 || (d = c + e), r.nodeType === 3 && (c += r.nodeValue.length), (O = r.firstChild) !== null; )
                y = r, r = O;
              for (; ; ) {
                if (r === l) break t;
                if (y === u && ++g === n && (f = c), y === i && ++z === e && (d = c), (O = r.nextSibling) !== null) break;
                r = y, y = r.parentNode;
              }
              r = O;
            }
            u = f === -1 || d === -1 ? null : { start: f, end: d };
          } else u = null;
        }
      u = u || { start: 0, end: 0 };
    } else u = null;
    for (lo = { focusedElem: l, selectionRange: u }, he = !1, a = (a & 335544064) === a, Wl = t, t = a ? 9270 : 1024; Wl !== null; ) {
      if (l = Wl, a && (u = l.deletions, u !== null))
        for (n = 0; n < u.length; n++)
          a && Of(u[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && h0(l), Si(a);
      else {
        if (l.tag === 22) {
          if (u = l.alternate, l.memoizedState !== null) {
            u !== null && u.memoizedState === null && a && Of(u), Si(a);
            continue;
          } else if (u !== null && u.memoizedState !== null) {
            a && h0(l), Si(a);
            continue;
          }
        }
        u = l.child, (l.subtreeFlags & t) !== 0 && u !== null ? (u.return = l, Wl = u) : (a && b0(l), Si(a));
      }
    }
    Ut = null;
  }
  function Si(l) {
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
              hl(t, t.return, c);
            }
          }
          break;
        case 3:
          if ((e & 1024) !== 0) {
            if (u = t.stateNode.containerInfo, a = u.nodeType, a === 9)
              co(u);
            else if (a === 1)
              switch (u.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  co(u);
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
          ), e = t.memoizedProps, e = ga(e.default, e.update), e !== "none" && ku(
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
  function _0(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        sa(l, a), u & 4 && Fe(5, a);
        break;
      case 1:
        if (sa(l, a), u & 4)
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
        u & 64 && r0(a), u & 512 && na(a, a.return);
        break;
      case 3:
        if (sa(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
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
            hl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && y0(a);
      case 26:
      case 5:
        sa(l, a), t === null && u & 4 && Sf(a), u & 512 && na(a, a.return);
        break;
      case 12:
        sa(l, a);
        break;
      case 31:
        sa(l, a), u & 4 && D0(l, a);
        break;
      case 13:
        sa(l, a), u & 4 && M0(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = ly.bind(
          null,
          a
        ), xy(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || Fl, !u) {
          var n = t !== null && t.memoizedState !== null || dl;
          t = Fl, e = dl, Fl = u, (dl = n) && !e ? (u = 2, (a.subtreeFlags & 8772) !== 0 && (u |= 1), It(
            l,
            a,
            u
          )) : sa(l, a), Fl = t, dl = e;
        }
        break;
      case 30:
        sa(l, a), u & 512 && na(a, a.return);
        break;
      case 7:
        u & 512 && na(a, a.return);
      default:
        sa(l, a);
    }
  }
  function Cf(l, t) {
    for (l = l.child; l !== null; )
      O0(l, t), l = l.sibling;
  }
  function O0(l, t) {
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
        Uf(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, rl = !0;
        } catch (f) {
          hl(l, l.return, f);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? hm(c, !0) : hm(l.stateNode, !1);
        } catch (f) {
          hl(l, l.return, f);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && Cf(l, t);
        break;
      default:
        Cf(l, t);
    }
  }
  function Uf(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var a = l, u = t;
          switch (a.tag) {
            case 4:
              O0(a, u);
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
  function N0(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, N0(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && _n(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Ul = null, bt = !1;
  function Ft(l, t, a) {
    for (a = a.child; a !== null; )
      A0(l, t, a), a = a.sibling;
  }
  function A0(l, t, a) {
    if (Nt && typeof Nt.onCommitFiberUnmount == "function")
      try {
        Nt.onCommitFiberUnmount(Te, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        dl || at(a, t), Ft(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !dl && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        dl || at(a, t), We(a);
        var u = Ul, e = bt;
        Ia(a.type) && (Ul = a.stateNode, bt = !1), Ft(
          l,
          t,
          a
        ), Um(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Ul = u, bt = e;
        break;
      case 5:
        dl || at(a, t), We(a);
      case 6:
        if (a.tag === 6 && We(a), u = Ul, e = bt, Ul = null, Ft(
          l,
          t,
          a
        ), Ul = u, bt = e, Ul !== null)
          if (bt)
            try {
              (Ul.nodeType === 9 ? Ul.body : Ul.nodeName === "HTML" ? Ul.ownerDocument.body : Ul).removeChild(a.stateNode), rl = !0;
            } catch (n) {
              hl(
                a,
                t,
                n
              );
            }
          else
            try {
              Ul.removeChild(a.stateNode), rl = !0;
            } catch (n) {
              hl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Ul !== null && (bt ? (l = Ul, ym(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), ge(l)) : ym(Ul, a.stateNode));
        break;
      case 4:
        u = Ul, e = bt, Ul = a.stateNode.containerInfo, bt = !0, Ft(
          l,
          t,
          a
        ), Ul = u, bt = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        La(2, a, t), dl || La(4, a, t), Ft(
          l,
          t,
          a
        );
        break;
      case 1:
        dl || (at(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && m0(
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
        at(a, t), Ft(
          l,
          t,
          a
        );
        break;
      case 7:
        dl || at(a, t), Ft(
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
  function D0(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        ge(l);
      } catch (a) {
        hl(t, t.return, a);
      }
    }
  }
  function M0(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        ge(l);
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
        return t === null && (t = l.stateNode = new z0()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new z0()), t;
      default:
        throw Error(h(435, l.tag));
    }
  }
  function bi(l, t) {
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
              if (Ia(f.type)) {
                Ul = f.stateNode, bt = !1;
                break l;
              }
              break;
            case 5:
              Ul = f.stateNode, bt = !1;
              break l;
            case 3:
            case 4:
              Ul = f.stateNode.containerInfo, bt = !0;
              break l;
          }
          f = f.return;
        }
        if (Ul === null) throw Error(h(160));
        A0(i, c, n), Ul = null, bt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        C0(t, l, a), t = t.sibling;
  }
  var Wt = null;
  function C0(l, t, a) {
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
        dt(t, l, a), vt(l), e & 4 && (La(3, l, l.return), Fe(3, l), La(5, l, l.return));
        break;
      case 1:
        dt(t, l, a), vt(l), e & 512 && (dl || u === null || at(u, u.return)), e & 64 && Fl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Wt, dt(t, l, a), vt(l), e & 512 && (dl || u === null || at(u, u.return)), e & 4)
          if (e = u !== null ? u.memoizedState : null, a = l.memoizedState, u === null)
            if (a === null)
              if (l.stateNode === null)
                if (Fl)
                  l.stateNode = mm(
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
                        u = e.getElementsByTagName("title")[0], (!u || u[_e] || u[kl] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = e.createElement(t), e.head.insertBefore(
                          u,
                          e.querySelector("head > title")
                        )), ut(u, t, a), u[kl] = l, wl(u), t = u;
                        break l;
                      case "link":
                        if (n = Bm(
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
                        if (n = Bm(
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
              l.stateNode = xm(
                n,
                a,
                l.memoizedProps
              );
          else
            e !== a ? (e === null ? (t = u.stateNode, t === null || dl || t.parentNode.removeChild(t)) : e.count--, a === null ? Fl || yo(n, l.type, l.stateNode) : xm(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && bf(
              l,
              l.memoizedProps,
              u.memoizedProps
            );
        break;
      case 27:
        dt(t, l, a), vt(l), e & 512 && (dl || u === null || at(u, u.return)), u !== null && e & 4 && bf(
          l,
          l.memoizedProps,
          u.memoizedProps
        );
        break;
      case 5:
        if (n = fa, fa = !1, dt(t, l, a), fa = n, vt(l), e & 512 && (dl || u === null || at(u, u.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Hu(t, ""), rl = !0;
          } catch (g) {
            hl(l, l.return, g);
          }
        }
        e & 4 && l.stateNode != null && (t = l.memoizedProps, bf(
          l,
          t,
          u !== null ? u.memoizedProps : t
        )), e & 1024 && (Df = !0);
        break;
      case 6:
        if (dt(t, l, a), vt(l), e & 4) {
          if (l.stateNode === null)
            throw Error(h(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, rl = !0;
          } catch (g) {
            hl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (rl = !1, Hi = null, n = Wt, Wt = cn(t.containerInfo), dt(t, l, a), Wt = n, vt(l), e & 4 && u !== null && u.memoizedState.isDehydrated)
          try {
            ge(t.containerInfo);
          } catch (g) {
            hl(l, l.return, g);
          }
        Df && (Df = !1, U0(l)), rl = !1;
        break;
      case 4:
        e = fa, fa = Fl, u = Wo(), n = Wt, Wt = cn(
          l.stateNode.containerInfo
        ), dt(t, l, a), vt(l), Wt = n, rl && Ie && (gi = !0), rl = u, fa = e;
        break;
      case 12:
        dt(t, l, a), vt(l);
        break;
      case 31:
        dt(t, l, a), vt(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, bi(l, t)));
        break;
      case 13:
        dt(t, l, a), vt(l), l.child.flags & 8192 && l.memoizedState !== null != (u !== null && u.memoizedState !== null) && (zi = Ot()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, bi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = u !== null && u.memoizedState !== null;
        var c = Fl, f = dl, d = fa;
        Fl = c || n, fa = d || n, dl = f || i, dt(t, l, a), dl = f, fa = d, Fl = c, vt(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || u === null || i || Fl || dl || (t = i || dl, a = Fl, u = dl, Fl = n || Fl, dl = t, Ka(l, 2), Fl = a, dl = u), !n && fa || Cf(l, n)), e & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, bi(l, a))));
        break;
      case 19:
        dt(t, l, a), vt(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, bi(l, t)));
        break;
      case 30:
        e & 512 && (dl || u === null || at(u, u.return)), e = Wo(), n = Ie, i = (a & 335544064) === a, c = l.memoizedProps, Ie = i && ga(
          c.default,
          c.update
        ) !== "none", dt(t, l, a), vt(l), i && u !== null && rl && (l.flags |= 4), Ie = n, rl = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (dl || u === null || at(u, u.return)), u && u.stateNode !== null && (u.stateNode._fragmentFiber = l);
      default:
        dt(t, l, a), vt(l);
    }
  }
  function vt(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (v0(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        u = null;
        for (var e = l.return; e !== null; ) {
          if (gf(e)) {
            var n = e.stateNode;
            u === null ? u = [n] : u.push(n);
          }
          if (hf(e)) break;
          e = e.return;
        }
        var i = u;
        if (a == null) throw Error(h(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, f = Tf(l);
            di(
              l,
              f,
              c,
              i
            );
            break;
          case 5:
            var d = a.stateNode;
            a.flags & 32 && (Hu(d, ""), a.flags &= -33);
            var g = Tf(l);
            di(
              l,
              g,
              d,
              i
            );
            break;
          case 3:
          case 4:
            var z = a.stateNode.containerInfo, r = Tf(l);
            Ef(
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
        hl(l, l.return, y);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function U0(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        U0(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, he = !0, t.reset(), he = !1), l = l.sibling;
      }
  }
  function Pu(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        R0(t, l), t = t.sibling;
    else E0(t);
  }
  function R0(l, t) {
    var a = l.alternate;
    if (a === null) zf(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Mf = oa = !1, g0(), Pu(t, l), !oa && !gi) {
            if (l = ia, l !== null)
              for (var u = 0; u < l.length; u += 3) {
                a = l[u];
                var e = l[u + 1];
                Sm(a, l[u + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
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
            )), Mf = !0;
          }
          ia = null;
          break;
        case 5:
          Pu(t, l);
          break;
        case 4:
          u = oa, oa = !1, Pu(t, l), oa && (gi = !0), oa = u;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? zf(l, !1) : Pu(t, l));
          break;
        case 30:
          u = oa, e = g0(), oa = !1, Pu(t, l), oa && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = ha(n, i), i = ha(a.memoizedProps, i);
          var c = ga(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, St = 0, t = Af(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), St !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (ie(
            l,
            l.memoizedProps.onUpdate
          ), ia = e) : e !== null && (e.push.apply(e, ia), ia = e), oa = (l.flags & 32) !== 0 ? !0 : u;
          break;
        default:
          Pu(t, l);
      }
  }
  function sa(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        _0(l, t.alternate, t), t = t.sibling;
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
          typeof e.componentWillUnmount == "function" && m0(
            a,
            a.return,
            e
          ), Ka(
            a,
            u
          );
          break;
        case 27:
          (u & 2) !== 0 && Um(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          at(a, a.return), a.tag !== 5 && a.tag !== 27 || We(a), Ka(
            a,
            u
          );
          break;
        case 6:
          We(a);
          break;
        case 26:
          at(a, a.return), e = a.stateNode, a.memoizedState !== null || e === null || dl || e.parentNode.removeChild(e), Ka(
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
          ), Fe(4, n);
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
              var d = e.shared.hiddenCallbacks;
              if (d !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < d.length; e++)
                  Ps(d[e], f);
            } catch (g) {
              hl(u, u.return, g);
            }
          }
          c && i & 64 && r0(n), na(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && y0(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || d0(n), It(
            e,
            n,
            a
          ), c && u === null && i & 4 && Sf(n), na(n, n.return);
          break;
        case 6:
          d0(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || Fl || yo(
            cn(f.ownerDocument),
            n.type,
            f
          ), It(
            e,
            n,
            a
          ), c && u === null && i & 4 && Sf(n), na(n, n.return);
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
          ), c && i & 4 && D0(e, n);
          break;
        case 13:
          It(
            e,
            n,
            a
          ), c && i & 4 && M0(e, n);
          break;
        case 22:
          n.memoizedState === null && It(
            e,
            n,
            a
          ), na(n, n.return);
          break;
        case 30:
          It(
            e,
            n,
            a
          ), na(n, n.return);
          break;
        case 7:
          na(n, n.return);
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
  function Rf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Be(a));
  }
  function pf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Be(l));
  }
  function Vt(l, t, a, u) {
    var e = (a & 335544064) === a;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        p0(
          l,
          t,
          a,
          u
        ), t = t.sibling;
    else e && T0(t);
  }
  function p0(l, t, a, u) {
    var e = (a & 335544064) === a;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && hi(t);
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
        ), n & 2048 && Fe(9, t);
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
        ), e && Mf && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && Be(n)));
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
          } catch (d) {
            hl(t, t.return, d);
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
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (e && c !== null && c.memoizedState === null && hi(c), i._visibility & 2 ? Vt(
          l,
          t,
          a,
          u
        ) : ke(
          l,
          t
        )) : (e && c !== null && c.memoizedState !== null && hi(t), i._visibility & 2 ? Vt(
          l,
          t,
          a,
          u
        ) : (i._visibility |= 2, le(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && Rf(c, t);
        break;
      case 24:
        Vt(
          l,
          t,
          a,
          u
        ), n & 2048 && pf(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (ca(n.child, !0), ca(t.child, !0))), Vt(
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
  function le(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, f = u, d = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          le(
            n,
            i,
            c,
            f,
            e
          ), Fe(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? le(
            n,
            i,
            c,
            f,
            e
          ) : ke(
            n,
            i
          ) : (g._visibility |= 2, le(
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
          le(
            n,
            i,
            c,
            f,
            e
          ), e && d & 2048 && pf(i.alternate, i);
          break;
        default:
          le(
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
  function ke(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            ke(a, u), e & 2048 && Rf(
              u.alternate,
              u
            );
            break;
          case 24:
            ke(a, u), e & 2048 && pf(u.alternate, u);
            break;
          default:
            ke(a, u);
        }
        t = t.sibling;
      }
  }
  var zu = 8192;
  function _u(l, t, a) {
    if (l.subtreeFlags & zu)
      for (l = l.child; l !== null; )
        j0(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function j0(l, t, a) {
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
        ) : (l = l.stateNode, (t & 335544128) === t && Xm(a, l)));
        break;
      case 5:
        _u(
          l,
          t,
          a
        ), l.flags & zu && (l = l.stateNode, (t & 335544128) === t && Xm(a, l));
        break;
      case 3:
      case 4:
        var u = Wt;
        Wt = cn(l.stateNode.containerInfo), _u(
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
          e.paired = null, Ut === null && (Ut = /* @__PURE__ */ new Map()), Ut.set(u, e);
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
  function H0(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Pe(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Wl = u, B0(
            u,
            l
          );
        }
      H0(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        x0(l), l = l.sibling;
  }
  function x0(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Pe(l), l.flags & 2048 && La(9, l, l.return);
        break;
      case 3:
        Pe(l);
        break;
      case 12:
        Pe(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, Ti(l)) : Pe(l);
        break;
      default:
        Pe(l);
    }
  }
  function Ti(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Wl = u, B0(
            u,
            l
          );
        }
      H0(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          La(8, t, t.return), Ti(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, Ti(t));
          break;
        default:
          Ti(t);
      }
      l = l.sibling;
    }
  }
  function B0(l, t) {
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
          Be(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, Wl = u;
      else
        l: for (a = l; Wl !== null; ) {
          u = Wl;
          var e = u.sibling, n = u.return;
          if (N0(u), u === a) {
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
  }, Kv = typeof WeakMap == "function" ? WeakMap : Map, ml = 0, zl = null, W = null, P = 0, yl = 0, Rt = null, Ja = !1, te = !1, jf = !1, Aa = 0, Hl = 0, wa = 0, Ou = 0, Ei = 0, pt = 0, ae = 0, ln = null, Tt = null, Hf = !1, zi = 0, q0 = 0, _i = 1 / 0, Oi = null, $a = null, pl = 0, kt = null, Nu = null, ra = 0, xf = 0, Bf = null, Y0 = null, ue = null, ee = null, ne = null, tn = 0, Ni = null;
  function jt() {
    return (ml & 2) !== 0 && P !== 0 ? P & -P : U.T !== null ? Jf() : Qo();
  }
  function G0() {
    if (pt === 0)
      if ((P & 536870912) === 0 || w) {
        var l = bn;
        bn <<= 1, (bn & 3932160) === 0 && (bn = 262144), pt = l;
      } else pt = 536870912;
    return l = lt.current, l !== null && (l.flags |= 32), pt;
  }
  function ie(l, t) {
    if (t != null) {
      var a = l.stateNode, u = a.ref;
      u === null && (u = a.ref = bm(
        ha(l.memoizedProps, a)
      )), ee === null && (ee = []), ee.push(t.bind(null, u));
    }
  }
  function Et(l, t, a) {
    (l === zl && (yl === 2 || yl === 9) || l.cancelPendingCommit !== null) && (ce(l, 0), Fa(
      l,
      P,
      pt,
      !1
    )), ze(l, a), ((ml & 2) === 0 || l !== zl) && (l === zl && ((ml & 2) === 0 && (Ou |= a), Hl === 4 && Fa(
      l,
      P,
      pt,
      !1
    )), ma(l));
  }
  function X0(l, t, a) {
    if ((ml & 6) !== 0) throw Error(h(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || Ee(l, t), e = u ? $v(l, t) : Yf(l, t, !0), n = u;
    do {
      if (e === 0) {
        te && !u && Fa(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Jv(a)) {
          e = Yf(l, t, !1), n = !1;
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
              e = ln;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (ce(c, i).flags |= 256), i = Yf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (jf && !f) {
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
          ce(l, 0), Fa(l, t, 0, !0);
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
              Tt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(h(329));
          }
          if ((t & 62914560) === t && (e = zi + 300 - Ot(), 10 < e)) {
            if (Fa(
              u,
              t,
              pt,
              !Ja
            ), En(u, 0, !0) !== 0) break l;
            ra = t, u.timeoutHandle = uo(
              Q0.bind(
                null,
                u,
                a,
                Tt,
                Oi,
                Hf,
                t,
                pt,
                Ou,
                ae,
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
          Q0(
            u,
            a,
            Tt,
            Oi,
            Hf,
            t,
            pt,
            Ou,
            ae,
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
    ma(l);
  }
  function Q0(l, t, a, u, e, n, i, c, f, d, g, z, r, y) {
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
      unsuspend: aa
    }, Ut = null, j0(
      t,
      n,
      z
    ), C && (O = z, C = l.containerInfo, C = (C.nodeType === 9 ? C : C.ownerDocument).__reactViewTransition, C != null && (O.count++, O.waitingForViewTransition = !0, O = sn.bind(O), C.finished.then(O, O))), O = (n & 62914560) === n ? zi - Ot() : (n & 4194048) === n ? q0 - Ot() : 0, O = Wy(
      z,
      O
    ), O !== null)) {
      ra = n, l.cancelPendingCommit = O(
        F0.bind(
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
    F0(
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
            if (!Mt(n(), e)) return !1;
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
    t = Bo(l, t), t &= ~Ei, t &= ~Ou, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - At(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && Yo(l, a, t);
  }
  function Ai() {
    return (ml & 6) === 0 ? (an(0), !1) : !0;
  }
  function qf() {
    if (W !== null) {
      if (yl === 0)
        var l = W.return;
      else
        l = W, Ta = mu = null, Lc(l), wu = null, Ge = 0, l = W;
      for (; l !== null; )
        s0(l.alternate, l), l = l.return;
      W = null;
    }
  }
  function ce(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, hy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), ra = 0, qf(), zl = l, W = a = Sa(l.current, null), P = t, yl = 0, Rt = null, Ja = !1, te = Ee(l, t), jf = !1, ae = pt = Ei = Ou = wa = Hl = 0, Tt = ln = null, Hf = !1, Aa = Bo(l, t), Hn(), a;
  }
  function Z0(l, t) {
    L = null, U.H = ni, t === Ju || t === Kn ? (t = Fs(), yl = 3) : t === Rc ? (t = Fs(), yl = 4) : yl = t === nf ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Rt = t, W === null && (Hl = 1, ii(
      l,
      Gt(t, l.current)
    ));
  }
  function V0() {
    var l = lt.current;
    return l === null ? !0 : (P & 4194048) === P ? ft === null : (P & 62914560) === P || (P & 536870912) !== 0 ? l === ft : !1;
  }
  function L0() {
    var l = U.H;
    return U.H = ni, l === null ? ni : l;
  }
  function K0() {
    var l = U.A;
    return U.A = Lv, l;
  }
  function Di() {
    Hl = 4, Ja || (P & 4194048) !== P && lt.current !== null || (te = !0), (wa & 134217727) === 0 && (Ou & 134217727) === 0 || zl === null || Fa(
      zl,
      P,
      pt,
      !1
    );
  }
  function Yf(l, t, a) {
    var u = ml;
    ml |= 2;
    var e = L0(), n = K0();
    (zl !== l || P !== t) && (Oi = null, ce(l, t)), t = !1;
    var i = Hl;
    l: do
      try {
        if (yl !== 0 && W !== null) {
          var c = W, f = Rt;
          switch (yl) {
            case 8:
              qf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              lt.current === null && (t = !0);
              var d = yl;
              if (yl = 0, Rt = null, fe(l, c, f, d), a && te) {
                i = 0;
                break l;
              }
              break;
            default:
              d = yl, yl = 0, Rt = null, fe(l, c, f, d);
          }
        }
        wv(), i = Hl;
        break;
      } catch (g) {
        Z0(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, Ta = mu = null, ml = u, U.H = e, U.A = n, W === null && (zl = null, P = 0, Hn()), i;
  }
  function wv() {
    for (; W !== null; ) J0(W);
  }
  function $v(l, t) {
    var a = ml;
    ml |= 2;
    var u = L0(), e = K0();
    zl !== l || P !== t ? (Oi = null, _i = Ot() + 500, ce(l, t)) : te = Ee(
      l,
      t
    );
    l: do
      try {
        if (yl !== 0 && W !== null) {
          t = W;
          var n = Rt;
          t: switch (yl) {
            case 1:
              yl = 0, Rt = null, fe(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (ws(n)) {
                yl = 0, Rt = null, w0(t);
                break;
              }
              t = function() {
                yl !== 2 && yl !== 9 || zl !== l || (yl = 7), ma(l);
              }, n.then(t, t);
              break l;
            case 3:
              yl = 7;
              break l;
            case 4:
              yl = 5;
              break l;
            case 7:
              ws(n) ? (yl = 0, Rt = null, w0(t)) : (yl = 0, Rt = null, fe(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (W.tag) {
                case 26:
                  i = W.memoizedState;
                case 5:
                case 27:
                  var c = W;
                  if (i ? Ym(i) : c.stateNode.complete) {
                    yl = 0, Rt = null;
                    var f = c.sibling;
                    if (f !== null) W = f;
                    else {
                      var d = c.return;
                      d !== null ? (W = d, Mi(d)) : W = null;
                    }
                    break t;
                  }
              }
              yl = 0, Rt = null, fe(l, t, n, 5);
              break;
            case 6:
              yl = 0, Rt = null, fe(l, t, n, 6);
              break;
            case 8:
              qf(), Hl = 6;
              break l;
            default:
              throw Error(h(462));
          }
        }
        Fv();
        break;
      } catch (g) {
        Z0(l, g);
      }
    while (!0);
    return Ta = mu = null, U.H = u, U.A = e, ml = a, W !== null ? 0 : (zl = null, P = 0, Hn(), Hl);
  }
  function Fv() {
    for (; W !== null && !md(); )
      J0(W);
  }
  function J0(l) {
    var t = f0(l.alternate, l, Aa);
    l.memoizedProps = l.pendingProps, t === null ? Mi(l) : W = t;
  }
  function w0(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = t0(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          P
        );
        break;
      case 11:
        t = t0(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          P
        );
        break;
      case 5:
        Lc(t);
        var u = t;
        u === $l && (w ? (Xn(u), u.tag === 5 && u.stateNode != null && (Ol = u.stateNode)) : (Xn(u), w = !0));
      default:
        s0(a, t), t = W = Bs(t, Aa), t = f0(a, t, Aa);
    }
    l.memoizedProps = l.pendingProps, t === null ? Mi(l) : W = t;
  }
  function fe(l, t, a, u) {
    Ta = mu = null, Lc(t), wu = null, Ge = 0;
    var e = t.return;
    try {
      if (Bv(
        l,
        e,
        t,
        a,
        P
      )) {
        Hl = 1, ii(
          l,
          Gt(a, l.current)
        ), W = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw W = e, n;
      Hl = 1, ii(
        l,
        Gt(a, l.current)
      ), W = null;
      return;
    }
    t.flags & 32768 ? (w || u === 1 ? l = !0 : te || (P & 536870912) !== 0 ? l = !1 : (Ja = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = lt.current, u !== null && u.tag === 13 && (u.flags |= 16384))), $0(t, l)) : Mi(t);
  }
  function Mi(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        $0(
          t,
          Ja
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
        W = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        W = t;
        return;
      }
      W = t = l;
    } while (t !== null);
    Hl === 0 && (Hl = 5);
  }
  function $0(l, t) {
    do {
      var a = Qv(l.alternate, l);
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
    Hl = 6, W = null;
  }
  function F0(l, t, a, u, e, n, i, c, f, d, g, z) {
    l.cancelPendingCommit = null;
    do
      Ci();
    while (pl !== 0);
    if ((ml & 6) !== 0) throw Error(h(327));
    if (t !== null) {
      if (t === l.current) throw Error(h(177));
      l === zl && (W = zl = null, P = 0), Nu = t, kt = l, ra = a, Bf = e, Y0 = u, Wv(
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
    if (xf = c, c |= Sc, zd(
      l,
      a,
      c,
      u,
      e,
      n
    ), ee = null, (a & 335544064) === a ? (ne = Ov(l), u = 10262) : (ne = null, u = 10256), (t.subtreeFlags & u) !== 0 || (t.flags & u) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, ay(gn, function() {
      return Zf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), vi = !1, u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
      u = U.T, U.T = null, e = Y.p, Y.p = 2, n = ml, ml |= 4;
      try {
        Zv(l, t, a);
      } finally {
        ml = n, Y.p = e, U.T = u;
      }
    }
    pl = 1, vi ? ue = zy(
      i,
      l.containerInfo,
      ne,
      Gf,
      Xf,
      kv,
      Qf,
      Zf,
      Iv
    ) : (Gf(), Xf(), Qf());
  }
  function Iv(l) {
    if (pl !== 0) {
      var t = kt.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function kv() {
    pl === 3 && (pl = 0, R0(Nu, kt), pl = 4);
  }
  function Gf() {
    if (pl === 1) {
      pl = 0;
      var l = kt, t = Nu, a = ra, u = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || u) {
        u = U.T, U.T = null;
        var e = Y.p;
        Y.p = 2;
        var n = ml;
        ml |= 4;
        try {
          Ie = gi = !1, C0(t, l, a), a = lo;
          var i = As(l.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && Ns(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && dc(c)) {
              var d = f.start, g = f.end;
              if (g === void 0 && (g = d), "selectionStart" in c)
                c.selectionStart = d, c.selectionEnd = Math.min(
                  g,
                  c.value.length
                );
              else {
                var z = c.ownerDocument || document, r = z && z.defaultView || window;
                if (r.getSelection) {
                  var y = r.getSelection(), O = c.textContent.length, C = Math.min(f.start, O), K = f.end === void 0 ? C : Math.min(f.end, O);
                  !y.extend && C > K && (i = K, K = C, C = i);
                  var m = Os(
                    c,
                    C
                  ), o = Os(
                    c,
                    K
                  );
                  if (m && o && (y.rangeCount !== 1 || y.anchorNode !== m.node || y.anchorOffset !== m.offset || y.focusNode !== o.node || y.focusOffset !== o.offset)) {
                    var v = z.createRange();
                    v.setStart(m.node, m.offset), y.removeAllRanges(), C > K ? (y.addRange(v), y.extend(o.node, o.offset)) : (v.setEnd(o.node, o.offset), y.addRange(v));
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
          he = !!Pf, lo = Pf = null;
        } finally {
          ml = n, Y.p = e, U.T = u;
        }
      }
      l.current = t, pl = 2;
    }
  }
  function Xf() {
    if (pl === 2) {
      pl = 0;
      var l = kt, t = Nu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = U.T, U.T = null;
        var u = Y.p;
        Y.p = 2;
        var e = ml;
        ml |= 4;
        try {
          _0(l, t.alternate, t);
        } finally {
          ml = e, Y.p = u, U.T = a;
        }
      }
      pl = 3;
    }
  }
  function Qf() {
    if (pl === 4 || pl === 3) {
      pl = 0;
      var l = ue;
      ue = null, dd();
      var t = kt, a = Nu, u = ra, e = Y0, n = (u & 335544064) === u ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? pl = 5 : (pl = 0, Nu = kt = null, W0(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && ($a = null), Fi(u), a = a.stateNode, Nt && typeof Nt.onCommitFiberRoot == "function")
        try {
          Nt.onCommitFiberRoot(
            Te,
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
      if (e = ee, i = ne, ne = null, e !== null && (ee = null, i === null && (i = []), l !== null))
        for (f = 0; f < e.length; f++)
          a = (0, e[f])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (ra & 3) !== 0 && Ci(), ma(t), n = t.pendingLanes, (u & 261930) !== 0 && (n & 42) !== 0 ? t === Ni ? tn++ : (tn = 0, Ni = t) : (tn = 0, Ni = null), an(0);
    }
  }
  function W0(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Be(t)));
  }
  function Ci() {
    return ue !== null && (ue.skipTransition(), ue = null), Gf(), Xf(), Qf(), Zf();
  }
  function Zf() {
    if (pl !== 5) return !1;
    var l = kt, t = xf;
    xf = 0;
    var a = Fi(ra), u = U.T, e = Y.p;
    try {
      Y.p = 32 > a ? 32 : a, U.T = null, a = Bf, Bf = null;
      var n = kt, i = ra;
      if (pl = 0, Nu = kt = null, ra = 0, (ml & 6) !== 0) throw Error(h(331));
      var c = ml;
      if (ml |= 4, x0(n.current), p0(
        n,
        n.current,
        i,
        a
      ), ml = c, an(0, !1), Nt && typeof Nt.onPostCommitFiberRoot == "function")
        try {
          Nt.onPostCommitFiberRoot(Te, n);
        } catch {
        }
      return !0;
    } finally {
      Y.p = e, U.T = u, W0(l, t);
    }
  }
  function I0(l, t, a) {
    t = Gt(a, t), t = ef(l.stateNode, t, 2), l = Xa(l, t, 2), l !== null && (ze(l, 2), ma(l));
  }
  function hl(l, t, a) {
    if (l.tag === 3)
      I0(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          I0(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && ($a === null || !$a.has(u))) {
            l = Gt(a, l), a = wr(2), u = Xa(t, a, 2), u !== null && ($r(
              a,
              u,
              t,
              l
            ), ze(u, 2), ma(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Vf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new Kv();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (jf = !0, e.add(a), l = Pv.bind(null, l, t, a), t.then(l, l));
  }
  function Pv(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, zl === l && (P & a) === a && ((Hl === 4 || Hl === 3 && (P & 62914560) === P && 300 > Ot() - zi) && (ml & 2) === 0 ? ce(l, 0) : Ei |= a, ae === P && (ae = 0)), ma(l);
  }
  function k0(l, t) {
    t === 0 && (t = qo()), l = ou(l, t), l !== null && (ze(l, t), ma(l));
  }
  function ly(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), k0(l, a);
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
    u !== null && u.delete(t), k0(l, a);
  }
  function ay(l, t) {
    return Ki(l, t);
  }
  var oe = null, se = null, Lf = !1, Ui = !1, Kf = !1, Wa = 0;
  function ma(l) {
    l !== se && l.next === null && (se === null ? oe = se = l : se = se.next = l), Ui = !0, Lf || (Lf = !0, ey());
  }
  function an(l, t) {
    if (!Kf && Ui) {
      Kf = !0;
      do
        for (var a = !1, u = oe; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, c = u.pingedLanes;
              n = (1 << 31 - At(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, am(u, n));
          } else
            n = P, n = En(
              u,
              u === zl ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || Ee(u, n) || (a = !0, am(u, n));
          u = u.next;
        }
      while (a);
      Kf = !1;
    }
  }
  function uy() {
    P0();
  }
  function P0() {
    Ui = Lf = !1;
    var l = 0;
    Wa !== 0 && yy() && (l = Wa);
    for (var t = Ot(), a = null, u = oe; u !== null; ) {
      var e = u.next, n = lm(u, t);
      n === 0 ? (u.next = null, a === null ? oe = e : a.next = e, e === null && (se = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Ui = !0)), u = e;
    }
    pl !== 0 && pl !== 5 || an(l), Wa !== 0 && (Wa = 0);
  }
  function lm(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - At(n), c = 1 << i, f = e[i];
      f === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = Ed(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = zl, a = P, a = En(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (yl === 2 || yl === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && Ji(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || Ee(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && Ji(u), Fi(a)) {
        case 2:
        case 8:
          a = Ho;
          break;
        case 32:
          a = gn;
          break;
        case 268435456:
          a = xo;
          break;
        default:
          a = gn;
      }
      return u = tm.bind(null, l), a = Ki(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && Ji(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function tm(l, t) {
    if (pl !== 0 && pl !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (Ci() && l.callbackNode !== a)
      return null;
    var u = P;
    return u = En(
      l,
      l === zl ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (X0(l, u, t), lm(l, Ot()), l.callbackNode != null && l.callbackNode === a ? tm.bind(null, l) : null);
  }
  function am(l, t) {
    if (Ci()) return null;
    X0(l, t, !0);
  }
  function ey() {
    gy(function() {
      (ml & 6) !== 0 ? Ki(
        jo,
        uy
      ) : P0();
    });
  }
  function Jf() {
    if (Wa === 0) {
      var l = yu;
      l === 0 && (l = Sn, Sn <<= 1, (Sn & 261888) === 0 && (Sn = 256)), Wa = l;
    }
    return Wa;
  }
  function um(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : An(l);
  }
  function ny(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = um(
        (e[ht] || null).action
      ), i = u.submitter;
      i && (t = (t = i[ht] || null) ? um(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
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
                  Pc(
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
                typeof n == "function" && (c.preventDefault(), f = new FormData(e, i), Pc(
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
  for (var wf = 0; wf < gc.length; wf++) {
    var $f = gc[wf], iy = $f.toLowerCase(), cy = $f[0].toUpperCase() + $f.slice(1);
    $t(
      iy,
      "on" + cy
    );
  }
  $t(Cs, "onAnimationEnd"), $t(Us, "onAnimationIteration"), $t(Rs, "onAnimationStart"), $t("dblclick", "onDoubleClick"), $t("focusin", "onFocus"), $t("focusout", "onBlur"), $t(hv, "onTransitionRun"), $t(gv, "onTransitionStart"), $t(Sv, "onTransitionCancel"), $t(ps, "onTransitionEnd"), pu("onMouseEnter", ["mouseout", "mouseover"]), pu("onMouseLeave", ["mouseout", "mouseover"]), pu("onPointerEnter", ["pointerout", "pointerover"]), pu("onPointerLeave", ["pointerout", "pointerover"]), iu(
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
  var un = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), fy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(un)
  );
  function em(l, t) {
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
              jn(g);
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
              jn(g);
            }
            e.currentTarget = null, n = f;
          }
      }
    }
  }
  function I(l, t) {
    var a = t[Vo];
    a === void 0 && (a = t[Vo] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (nm(t, l, 2, !1), a.add(u));
  }
  function Ff(l, t, a) {
    var u = 0;
    t && (u |= 4), nm(
      a,
      l,
      u,
      t
    );
  }
  var Ri = "_reactListening" + Math.random().toString(36).slice(2);
  function Wf(l) {
    if (!l[Ri]) {
      l[Ri] = !0, Jo.forEach(function(a) {
        a !== "selectionchange" && (fy.has(a) || Ff(a, !1, l), Ff(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Ri] || (t[Ri] = !0, Ff("selectionchange", !1, t));
    }
  }
  function nm(l, t, a, u) {
    switch ($m(t)) {
      case 2:
        var e = lh;
        break;
      case 8:
        e = th;
        break;
      default:
        e = go;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !uc || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function If(l, t, a, u, e) {
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
      var d = n, g = tc(a), z = [];
      l: {
        var r = js.get(l);
        if (r !== void 0) {
          var y = Un, O = l;
          switch (l) {
            case "keypress":
              if (Mn(a) === 0) break l;
            case "keydown":
            case "keyup":
              y = Jd;
              break;
            case "focusin":
              O = "focus", y = cc;
              break;
            case "focusout":
              O = "blur", y = cc;
              break;
            case "beforeblur":
            case "afterblur":
              y = cc;
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
              y = Hd;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              y = Id;
              break;
            case Cs:
            case Us:
            case Rs:
              y = qd;
              break;
            case ps:
              y = Pd;
              break;
            case "scroll":
            case "scrollend":
              y = pd;
              break;
            case "wheel":
              y = tv;
              break;
            case "copy":
            case "cut":
            case "paste":
              y = Gd;
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
              y = Fd;
              break;
            case "toggle":
            case "beforetoggle":
              y = uv;
          }
          var C = (t & 4) !== 0, K = !C && (l === "scroll" || l === "scrollend"), m = C ? r !== null ? r + "Capture" : null : r;
          C = [];
          for (var o = d, v; o !== null; ) {
            var E = o;
            if (v = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || v === null || m === null || (E = Ne(o, m), E != null && C.push(
              en(o, E, v)
            )), K) break;
            o = o.return;
          }
          0 < C.length && (r = new y(
            r,
            O,
            null,
            a,
            g
          ), z.push({ event: r, listeners: C }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (y = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", y && a !== lc && (O = a.relatedTarget || a.fromElement) && (nu(O) || O[Cu]))
            break l;
          (r || y) && (O = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, r ? (y = a.relatedTarget || a.toElement, r = d, y = y ? nu(y) : null, y !== null && (K = ol(y), C = y.tag, y !== K || C !== 5 && C !== 27 && C !== 6) && (y = null)) : (r = null, y = d), r !== y && (C = fs, E = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (C = ss, E = "onPointerLeave", m = "onPointerEnter", o = "pointer"), K = r == null ? O : Oe(r), v = y == null ? O : Oe(y), O = new C(
            E,
            o + "leave",
            r,
            a,
            g
          ), O.target = K, O.relatedTarget = v, E = null, nu(g) === d && (C = new C(
            m,
            o + "enter",
            y,
            a,
            g
          ), C.target = v, C.relatedTarget = K, E = C), K = E, C = r && y ? Kl(
            r,
            y,
            oy
          ) : null, r !== null && im(
            z,
            O,
            r,
            C,
            !1
          ), y !== null && K !== null && im(
            z,
            K,
            y,
            C,
            !0
          )));
        }
        l: {
          if (r = d ? Oe(d) : window, y = r.nodeName && r.nodeName.toLowerCase(), y === "select" || y === "input" && r.type === "file")
            var D = Ss;
          else if (hs(r))
            if (bs)
              D = dv;
            else {
              D = rv;
              var ll = sv;
            }
          else
            y = r.nodeName, !y || y.toLowerCase() !== "input" || r.type !== "checkbox" && r.type !== "radio" ? d && Pi(d.elementType) && (D = Ss) : D = mv;
          if (D && (D = D(l, d))) {
            gs(
              z,
              D,
              a,
              g
            );
            break l;
          }
          ll && ll(l, r, d);
        }
        switch (ll = d ? Oe(d) : window, l) {
          case "focusin":
            (hs(ll) || ll.contentEditable === "true") && (Yu = ll, vc = d, je = null);
            break;
          case "focusout":
            je = vc = Yu = null;
            break;
          case "mousedown":
            yc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            yc = !1, Ds(z, a, g);
            break;
          case "selectionchange":
            if (yv) break;
          case "keydown":
          case "keyup":
            Ds(z, a, g);
        }
        var p;
        if (oc)
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
          qu ? vs(l, a) && (q = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (q = "onCompositionStart");
        q && (rs && a.locale !== "ko" && (qu || q !== "onCompositionStart" ? q === "onCompositionEnd" && qu && (p = is()) : (Ra = g, ec = "value" in Ra ? Ra.value : Ra.textContent, qu = !0)), ll = pi(d, q), 0 < ll.length && (q = new os(
          q,
          l,
          null,
          a,
          g
        ), z.push({ event: q, listeners: ll }), p ? q.data = p : (p = ys(a), p !== null && (q.data = p)))), (p = nv ? iv(l, a) : cv(l, a)) && (q = pi(d, "onBeforeInput"), 0 < q.length && (ll = new os(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), z.push({
          event: ll,
          listeners: q
        }), ll.data = p)), ny(
          z,
          l,
          d,
          a,
          g
        );
      }
      em(z, t);
    });
  }
  function en(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function pi(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = Ne(l, a), e != null && u.unshift(
        en(l, e, n)
      ), e = Ne(l, t), e != null && u.push(
        en(l, e, n)
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
  function im(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var c = a, f = c.alternate, d = c.stateNode;
      if (c = c.tag, f !== null && f === u) break;
      c !== 5 && c !== 26 && c !== 27 || d === null || (f = d, e ? (d = Ne(a, n), d != null && i.unshift(
        en(a, d, f)
      )) : e || (d = Ne(a, n), d != null && i.push(
        en(a, d, f)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var sy = /\r\n?/g, ry = /\u0000|\uFFFD/g;
  function cm(l) {
    return (typeof l == "string" ? l : "" + l).replace(sy, `
`).replace(ry, "");
  }
  function fm(l, t) {
    return t = cm(t), cm(l) === t;
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
        Nn(l, "class", u);
        break;
      case "tabIndex":
        Nn(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Nn(l, a, u);
        break;
      case "style":
        us(l, u, n);
        return;
      case "data":
        if (t !== "object") {
          Nn(l, "data", u);
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
        u = An(u), l.setAttribute(a, u);
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
        u = An(u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = aa);
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
        a = An(u), l.setAttributeNS(
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
        I("beforetoggle", l), I("toggle", l), On(l, "popover", u);
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
        On(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = Ud.get(a) || a, On(l, a, u);
        else return;
    }
    rl = !0;
  }
  function kf(l, t, a, u, e, n) {
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
        if (typeof u == "string") Hu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          Hu(l, "" + u);
        else return;
        break;
      case "onScroll":
        u != null && I("scroll", l);
        return;
      case "onScrollEnd":
        u != null && I("scrollend", l);
        return;
      case "onClick":
        u != null && (l.onclick = aa);
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
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), n = a.slice(2, e ? a.length - 7 : void 0), t = l[ht] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof u == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, u, e);
              break l;
            }
            rl = !0, a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : On(l, a, u);
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
                  gl(l, t, n, i, a, null);
              }
          }
        e && gl(l, t, "srcSet", a.srcSet, a, null), u && gl(l, t, "src", a.src, a, null);
        return;
      case "input":
        I("invalid", l);
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
                  gl(l, t, u, g, a, null);
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
                gl(l, t, e, c, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? ju(l, !!u, t, !1) : a != null && ju(l, !!u, a, !0);
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
                gl(l, t, i, c, a, null);
            }
        ts(l, u, e, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (u = a[f], u != null) && (f === "selected" ? l.selected = u && typeof u != "function" && typeof u != "symbol" : gl(l, t, f, u, a, null));
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
        for (u = 0; u < un.length; u++)
          I(un[u], l);
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
        for (d in a)
          if (a.hasOwnProperty(d) && (u = a[d], u != null))
            switch (d) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(h(137, t));
              default:
                gl(l, t, d, u, a, null);
            }
        return;
      default:
        if (Pi(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (u = a[g], u !== void 0 && kf(
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
                u.hasOwnProperty(y) || gl(l, t, y, null, u, z);
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
                y !== z && gl(
                  l,
                  t,
                  r,
                  y,
                  u,
                  z
                );
            }
        }
        Ii(
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
                n !== f && (rl = !0), r = n;
                break;
              case "defaultValue":
                n !== f && (rl = !0), c = n;
                break;
              case "multiple":
                n !== f && (rl = !0), i = n;
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
        t = c, a = i, u = y, r != null ? ju(l, !!a, r, !1) : !!u != !!a && (t != null ? ju(l, !!a, t, !0) : ju(l, !!a, a ? [] : "", !1));
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
                gl(l, t, c, null, u, e);
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
                e !== n && gl(l, t, i, e, u, n);
            }
        ls(l, r, y);
        return;
      case "option":
        for (var O in a)
          r = a[O], a.hasOwnProperty(O) && r != null && !u.hasOwnProperty(O) && (O === "selected" ? l.selected = !1 : gl(
            l,
            t,
            O,
            null,
            u,
            r
          ));
        for (f in u)
          r = u[f], y = a[f], u.hasOwnProperty(f) && r !== y && (r != null || y != null) && (f === "selected" ? (r !== y && (rl = !0), l.selected = r && typeof r != "function" && typeof r != "symbol") : gl(
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
        for (var C in a)
          r = a[C], a.hasOwnProperty(C) && r != null && !u.hasOwnProperty(C) && gl(l, t, C, null, u, r);
        for (d in u)
          if (r = u[d], y = a[d], u.hasOwnProperty(d) && r !== y && (r != null || y != null))
            switch (d) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (r != null)
                  throw Error(h(137, t));
                break;
              default:
                gl(
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
        if (Pi(t)) {
          for (var K in a)
            r = a[K], a.hasOwnProperty(K) && r !== void 0 && !u.hasOwnProperty(K) && kf(
              l,
              t,
              K,
              void 0,
              u,
              r
            );
          for (g in u)
            r = u[g], y = a[g], !u.hasOwnProperty(g) || r === y || r === void 0 && y === void 0 || kf(
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
      r = a[m], a.hasOwnProperty(m) && r != null && !u.hasOwnProperty(m) && gl(l, t, m, null, u, r);
    for (z in u)
      r = u[z], y = a[z], !u.hasOwnProperty(z) || r === y || r == null && y == null || gl(l, t, z, r, u, y);
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
  function vy() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, c = e.duration;
        if (n && c && om(i)) {
          for (i = 0, c = e.responseEnd, u += 1; u < a.length; u++) {
            var f = a[u], d = f.startTime;
            if (d > c) break;
            var g = f.transferSize, z = f.initiatorType;
            g && om(z) && (f = f.responseEnd, i += g * (f < c ? 1 : (c - d) / (f - d)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var Pf = null, lo = null;
  function nn(l) {
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
  function mm(l, t, a, u) {
    return a = nn(
      a
    ).createElement(l), a[kl] = u, a[ht] = t, ut(a, l, t), wl(a), a;
  }
  function to(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var ao = null;
  function yy() {
    var l = window.event;
    return l && l.type === "popstate" ? l === ao ? !1 : (ao = l, !0) : (ao = null, !1);
  }
  var uo = typeof setTimeout == "function" ? setTimeout : void 0, hy = typeof clearTimeout == "function" ? clearTimeout : void 0, dm = typeof Promise == "function" ? Promise : void 0, vm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : uo, gy = typeof queueMicrotask == "function" ? queueMicrotask : typeof dm < "u" ? function(l) {
    return dm.resolve(null).then(l).catch(Sy);
  } : uo;
  function Sy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Ia(l) {
    return l === "head";
  }
  function ym(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), ge(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          ro(
            l.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = l.ownerDocument.head, ro(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[_e] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && ro(l.ownerDocument.body);
      a = e;
    } while (a);
    ge(t);
  }
  function hm(l, t) {
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
  function gm(l, t, a) {
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
  function Sm(l, t) {
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
  function eo(l) {
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
    var d = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = d.startViewTransition({
        update: function() {
          var r = d.defaultView, y = r.navigation && r.navigation.transition, O = d.fonts.status;
          u();
          var C = [];
          if (O === "loaded" && (Ty(d), d.fonts.status === "loading" && C.push(d.fonts.ready)), O = C.length, l !== null)
            for (var K = l.suspenseyImages, m = 0, o = 0; o < K.length; o++) {
              var v = K[o];
              if (!v.complete) {
                var E = v.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < r.innerHeight && E.left < r.innerWidth) {
                  if (m += Gm(v), m > xi) {
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
            return r = Promise.race([
              Promise.all(C),
              new Promise(function(D) {
                return setTimeout(D, 500);
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
            var O = r[y], C = O.effect, K = C.pseudoElement;
            if (K != null && K.startsWith("::view-transition")) {
              z.push(O), O = C.getKeyframes();
              for (var m = K = void 0, o = !0, v = 0; v < O.length; v++) {
                var E = O[v], D = E.width;
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
              o && K !== void 0 && m !== void 0 && (C.setKeyframes(O), o = getComputedStyle(
                C.target,
                C.pseudoElement
              ), o.width !== K || o.height !== m) && (o = O[0], o.width = K, o.height = m, o = O[O.length - 1], o.width = K, o.height = m, C.setKeyframes(O));
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
    return t = typeof t == "number" ? { duration: t } : Z({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, Au.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), u = [], e = 0; e < a.length; e++) {
      var n = a[e].effect;
      n !== null && n.target === l && n.pseudoElement === t && u.push(a[e]);
    }
    return u;
  }, Au.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function bm(l) {
    return {
      name: l,
      group: new Au("group", l),
      imagePair: new Au("image-pair", l),
      old: new Au("old", l),
      new: new Au("new", l)
    };
  }
  function Ht(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  Ht.prototype.addEventListener = function(l, t, a) {
    var u = null, e = null;
    if (!(a != null && typeof a != "boolean" && (u = a.signal || null, u !== null && u.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (Em(n, l, t, a) === -1) {
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
        ), u.addEventListener("abort", e, { once: !0 }), e = u.removeEventListener.bind(u, "abort", e)), u = re(a), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: e
        }), T(
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
    return nl(l).addEventListener(
      t,
      a,
      u
    ), !1;
  }
  Ht.prototype.removeEventListener = function(l, t, a) {
    var u = this._eventListeners;
    if (u !== null && (t = Em(
      u,
      l,
      t,
      a
    ), t !== -1)) {
      var e = u[t];
      a = e.attachedListener;
      var n = e.cleanup;
      e = re(e.optionsOrUseCapture), T(
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
    return nl(l).removeEventListener(
      t,
      a,
      u
    ), !1;
  }
  function re(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function Tm(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function Em(l, t, a, u) {
    if (l.length === 0) return -1;
    u = Tm(u);
    for (var e = 0; e < l.length; e++) {
      var n = l[e];
      if (n.type === t && n.listener === a && Tm(n.optionsOrUseCapture) === u)
        return e;
    }
    return -1;
  }
  Ht.prototype.dispatchEvent = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = nl(t);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !l.bubbles) {
      var u = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (a)
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.addEventListener(
            n.type,
            n.attachedListener,
            re(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(u), l = u.dispatchEvent(l), a)
        for (e = 0; e < a.length; e++)
          n = a[e], u.removeEventListener(
            n.type,
            n.attachedListener,
            re(n.optionsOrUseCapture)
          );
      return t.removeChild(u), l;
    }
    return t.dispatchEvent(l);
  }, Ht.prototype.focus = function(l) {
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
    return l.tag === 6 ? !1 : (l = nl(l), By(l, t));
  }
  Ht.prototype.focusLast = function(l) {
    var t = [];
    T(
      this._fragmentFiber.child,
      !0,
      no,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !zm(t[a], l); a--) ;
  };
  function no(l, t) {
    return t.push(l), !1;
  }
  Ht.prototype.blur = function() {
    var l = H(
      this._fragmentFiber
    );
    l !== null && (l = nl(l), l = nn(l).activeElement, l !== null && T(
      this._fragmentFiber.child,
      !1,
      Ny,
      l,
      void 0,
      void 0
    ));
  };
  function Ny(l, t) {
    return l.tag === 6 ? !1 : (l = nl(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  Ht.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), T(
      this._fragmentFiber.child,
      !1,
      Ay,
      l,
      void 0,
      void 0
    );
  };
  function Ay(l, t) {
    return l.tag === 6 || (l = nl(l), t.observe(l)), !1;
  }
  Ht.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), T(
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
    return l.tag === 6 || (l = nl(l), t.unobserve(l)), !1;
  }
  var Pt = [], io = !1;
  function My(l, t, a) {
    Pt.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), io || (io = !0, qy(function() {
      io = !1;
      var u = Pt;
      Pt = [];
      for (var e = 0; e < u.length; e++) {
        var n = u[e];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  Ht.prototype.getClientRects = function() {
    var l = [];
    return T(
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
      l = nl(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  Ht.prototype.getRootNode = function(l) {
    var t = H(
      this._fragmentFiber
    );
    return t === null ? this : nl(t).getRootNode(l);
  }, Ht.prototype.compareDocumentPosition = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    T(
      this._fragmentFiber.child,
      !1,
      no,
      a,
      void 0,
      void 0
    );
    var u = nl(t);
    if (a.length === 0) {
      if (a = u, Sl(this._fragmentFiber)) {
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
      return a === l ? e = Node.DOCUMENT_POSITION_CONTAINS : u & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = Cl(t)[1], a === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = nl(a).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = nl(a[0]), e = nl(a[a.length - 1]);
    var n = Sl(this._fragmentFiber) ? t.parentElement : u;
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
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = Kl(
      a,
      n,
      Tl
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Yl,
      n,
      a
    ), n = xl, xl = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === u) && (t = Kl(
      u,
      n,
      Tl
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Q,
      n,
      u
    ), n = xl, $ = xl = null, t = n !== null)), t) : !1;
  }
  function _m(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  Ht.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(h(566));
    var t = [];
    T(
      this._fragmentFiber.child,
      !1,
      no,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var u = Cl(
        this._fragmentFiber
      );
      if (u = a ? u[1] || u[0] || H(this._fragmentFiber) : u[0] || u[1], u === null) return;
      if (u.tag === 6) {
        l = nl(u), _m(l, a);
        return;
      }
      if (u = nl(u), u.nodeType !== 9) {
        if (u.nodeType === 11) {
          a = "host" in u ? u.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        u.scrollIntoView(l);
      }
    }
    for (u = a ? t.length - 1 : 0; u !== (a ? -1 : t.length); ) {
      var e = t[u];
      e.tag === 6 ? (e = nl(e), _m(e, a)) : nl(e).scrollIntoView(l), u += a ? -1 : 1;
    }
  };
  function Ry(l, t) {
    return l = nl(l), Om(l, t), !1;
  }
  function Om(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function Nm(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.addEventListener(
          e.type,
          e.attachedListener,
          re(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < Pt.length; c++) {
        var f = Pt[c];
        (f.fragmentInstance !== t || f.observer !== n || f.instance !== l) && (Pt[i++] = f);
      }
      Pt.length = i, n.observe(l);
    }), Om(l, t));
  }
  function py(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.removeEventListener(
          e.type,
          e.attachedListener,
          re(e.optionsOrUseCapture)
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
  function co(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          co(a), _n(a);
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
  function jy(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[_e])
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
  function Hy(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Lt(l.nextSibling), l === null)) return null;
    return l;
  }
  function Am(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Lt(l.nextSibling), l === null)) return null;
    return l;
  }
  function fo(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function oo(l) {
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
  var so = null;
  function Dm(l) {
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
  function Mm(l) {
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
    vm(function() {
      vm(function(t) {
        return l(t);
      });
    });
  }
  function Cm(l, t, a) {
    switch (t = nn(a), l) {
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
  function Um(l, t, a) {
    for (var u in a) {
      var e = a[u];
      a.hasOwnProperty(u) && e != null && gl(l, t, u, null, my, e);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === aa && (l.onclick = null), _n(l);
  }
  function ro(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    _n(l);
  }
  var Kt = /* @__PURE__ */ new Map(), Rm = /* @__PURE__ */ new Set();
  function cn(l) {
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
    var l = Da.f(), t = Ai();
    return l || t;
  }
  function Gy(l) {
    var t = Uu(l);
    t !== null && t.tag === 5 && t.type === "form" ? jr(t) : Da.r(l);
  }
  var me = typeof document > "u" ? null : document;
  function pm(l, t, a) {
    var u = me;
    if (u && typeof t == "string" && t) {
      var e = qt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Rm.has(e) || (Rm.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), ut(t, "link", l), wl(t), u.head.appendChild(t)));
    }
  }
  function Xy(l) {
    Da.D(l), pm("dns-prefetch", l, null);
  }
  function Qy(l, t) {
    Da.C(l, t), pm("preconnect", l, t);
  }
  function Zy(l, t, a) {
    Da.L(l, t, a);
    var u = me;
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
          n = de(l);
          break;
        case "script":
          n = ve(l);
      }
      if (!(Kt.has(n) || (l = Z(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Kt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(fn(n)) || t === "script" && u.querySelector(on(n))))) {
        var i = u.createElement("link");
        ut(i, "link", l), t === "style" && (i[zn] = !0, i.onload = i.onerror = function() {
          Ko(i);
        }), wl(i), u.head.appendChild(i);
      }
    }
  }
  function Vy(l, t) {
    Da.m(l, t);
    var a = me;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + qt(u) + '"][href="' + qt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = ve(l);
      }
      if (!Kt.has(n) && (l = Z({ rel: "modulepreload", href: l }, t), Kt.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(on(n)))
              return;
        }
        u = a.createElement("link"), ut(u, "link", l), wl(u), a.head.appendChild(u);
      }
    }
  }
  function Ly(l, t, a) {
    Da.S(l, t, a);
    var u = me;
    if (u && l) {
      var e = Ru(u).hoistableStyles, n = de(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = u.querySelector(
          fn(n)
        ))
          c.loading = 5;
        else {
          l = Z(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Kt.get(n)) && mo(l, a);
          var f = i = u.createElement("link");
          wl(f), ut(f, "link", l), f._p = new Promise(function(d, g) {
            f.onload = d, f.onerror = g;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, ji(i, t, u);
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
    var a = me;
    if (a && l) {
      var u = Ru(a).hoistableScripts, e = ve(l), n = u.get(e);
      n || (n = a.querySelector(on(e)), n || (l = Z({ src: l, async: !0 }, t), (t = Kt.get(e)) && vo(l, t), n = a.createElement("script"), wl(n), ut(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Jy(l, t) {
    Da.M(l, t);
    var a = me;
    if (a && l) {
      var u = Ru(a).hoistableScripts, e = ve(l), n = u.get(e);
      n || (n = a.querySelector(on(e)), n || (l = Z({ src: l, async: !0, type: "module" }, t), (t = Kt.get(e)) && vo(l, t), n = a.createElement("script"), wl(n), ut(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function jm(l, t, a, u) {
    var e = (e = la.current) ? cn(e) : null;
    if (!e) throw Error(h(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = de(a.href), t = Ru(
          e
        ).hoistableStyles, u = t.get(a), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = de(a.href);
          var n = Ru(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            fn(l)
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
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = ve(a), t = Ru(
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
  function de(l) {
    return 'href="' + qt(l) + '"';
  }
  function fn(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function Hm(l) {
    return Z({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function wy(l, t, a, u) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[zn] !== !0) {
        u.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[zn] = !0, t.onload = t.onerror = Ko.bind(null, t), ut(t, "link", a), wl(t), l.head.appendChild(t);
    u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    });
  }
  function ve(l) {
    return '[src="' + qt(l) + '"]';
  }
  function on(l) {
    return "script[async]" + l;
  }
  function xm(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + qt(a.href) + '"]'
          );
          if (u)
            return t.instance = u, wl(u), u;
          var e = Z({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), wl(u), ut(u, "style", e), ji(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = de(a.href);
          var n = l.querySelector(
            fn(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, wl(n), n;
          u = Hm(a), (e = Kt.get(e)) && mo(u, e), n = (l.ownerDocument || l).createElement("link"), wl(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), ut(n, "link", u), t.state.loading |= 4, ji(n, a.precedence, l), t.instance = n;
        case "script":
          return n = ve(a.src), (e = l.querySelector(
            on(n)
          )) ? (t.instance = e, wl(e), e) : (u = a, (e = Kt.get(n)) && (u = Z({}, a), vo(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), wl(e), ut(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(h(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, ji(u, a.precedence, l));
    return t.instance;
  }
  function ji(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var c = u[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function mo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function vo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Hi = null;
  function Bm(l, t, a) {
    if (Hi === null) {
      var u = /* @__PURE__ */ new Map(), e = Hi = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Hi, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[_e] || n[kl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
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
  function qm(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function Ym(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function Gm(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Xm(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += Gm(t), l.suspenseyImages.push(t)), l = Iy.bind(l), t.decode().then(l, l));
  }
  function Fy(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = de(u.href), n = t.querySelector(
          fn(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = sn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, wl(n);
          return;
        }
        n = t.ownerDocument || t, u = Hm(u), (e = Kt.get(e)) && mo(u, e), n = n.createElement("link"), wl(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), ut(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = sn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var xi = 0;
  function Wy(l, t) {
    return l.stylesheets && l.count === 0 && qi(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && qi(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && xi === 0 && (xi = 62500 * vy());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && qi(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > xi ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function Qm(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) qi(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function sn() {
    this.count--, Qm(this);
  }
  function Iy() {
    this.imgCount--, Qm(this);
  }
  var Bi = null;
  function qi(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Bi = /* @__PURE__ */ new Map(), t.forEach(ky, l), Bi = null, sn.call(l));
  }
  function ky(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Bi.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Bi.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = sn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var ye = {
    $$typeof: _l,
    Provider: null,
    Consumer: null,
    _currentValue: xt,
    _currentValue2: xt,
    _threadCount: 0
  };
  function Py(l, t, a, u, e, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = wi(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = wi(0), this.hiddenUpdates = wi(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Zm(l, t, a, u, e, n, i, c, f, d, g, z) {
    return l = new Py(
      l,
      t,
      a,
      i,
      f,
      d,
      g,
      z,
      c
    ), t = 1, n === !0 && (t |= 24), n = gt(3, null, null, t), l.current = n, n.stateNode = l, t = Mc(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, pc(n), l;
  }
  function Vm(l) {
    return l ? (l = Qu, l) : Qu;
  }
  function Lm(l, t, a, u, e, n) {
    e = Vm(e), u.context === null ? u.context = e : u.pendingContext = e, u = Ga(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = Xa(l, u, t), a !== null && (Et(a, l, t), Xe(a, l, t));
  }
  function Km(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function ho(l, t) {
    Km(l, t), (l = l.alternate) && Km(l, t);
  }
  function Jm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = ou(l, 67108864);
      t !== null && Et(t, l, 67108864), ho(l, 67108864);
    }
  }
  function wm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = jt();
      t = $i(t);
      var a = ou(l, t);
      a !== null && Et(a, l, t), ho(l, t);
    }
  }
  var he = !0;
  function lh(l, t, a, u) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 2, go(l, t, a, u);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function th(l, t, a, u) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 8, go(l, t, a, u);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function go(l, t, a, u) {
    if (he) {
      var e = So(u);
      if (e === null)
        If(
          l,
          t,
          u,
          Yi,
          a
        ), Fm(l, u);
      else if (uh(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (Fm(l, u), t & 4 && -1 < ah.indexOf(l)) {
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
                      var f = 1 << 31 - At(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    ma(n), (ml & 6) === 0 && (_i = Ot() + 500, an(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = ou(n, 2), c !== null && Et(c, n, 2), Ai(), ho(n, 2);
            }
          if (n = So(u), n === null && If(
            l,
            t,
            u,
            Yi,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        If(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function So(l) {
    return l = tc(l), bo(l);
  }
  var Yi = null;
  function bo(l) {
    if (Yi = null, l = nu(l), l !== null) {
      var t = ol(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = Rl(t), l !== null) return l;
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
    return Yi = l, null;
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
        switch (vd()) {
          case jo:
            return 2;
          case Ho:
            return 8;
          case gn:
          case yd:
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
  var To = !1, ka = null, Pa = null, lu = null, rn = /* @__PURE__ */ new Map(), mn = /* @__PURE__ */ new Map(), tu = [], ah = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Fm(l, t) {
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
        rn.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        mn.delete(t.pointerId);
    }
  }
  function dn(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Uu(t), t !== null && Jm(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function uh(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return ka = dn(
          ka,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return Pa = dn(
          Pa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return lu = dn(
          lu,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return rn.set(
          n,
          dn(
            rn.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, mn.set(
          n,
          dn(
            mn.get(n) || null,
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
  function Wm(l) {
    var t = nu(l.target);
    if (t !== null) {
      var a = ol(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = Rl(a), t !== null) {
            l.blockedOn = t, Zo(l.priority, function() {
              wm(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Ll(a), t !== null) {
            l.blockedOn = t, Zo(l.priority, function() {
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
  function Gi(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = So(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        lc = u, a.target.dispatchEvent(u), lc = null;
      } else
        return t = Uu(a), t !== null && Jm(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function Im(l, t, a) {
    Gi(l) && a.delete(t);
  }
  function eh() {
    To = !1, ka !== null && Gi(ka) && (ka = null), Pa !== null && Gi(Pa) && (Pa = null), lu !== null && Gi(lu) && (lu = null), rn.forEach(Im), mn.forEach(Im);
  }
  function Xi(l, t) {
    l.blockedOn === t && (l.blockedOn = null, To || (To = !0, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      eh
    )));
  }
  var Qi = null;
  function km(l) {
    Qi !== l && (Qi = l, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      function() {
        Qi === l && (Qi = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (bo(u || a) === null)
              continue;
            break;
          }
          var n = Uu(a);
          n !== null && (l.splice(t, 3), t -= 3, Pc(
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
  function ge(l) {
    function t(f) {
      return Xi(f, l);
    }
    ka !== null && Xi(ka, l), Pa !== null && Xi(Pa, l), lu !== null && Xi(lu, l), rn.forEach(t), mn.forEach(t);
    for (var a = 0; a < tu.length; a++) {
      var u = tu[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < tu.length && (a = tu[0], a.blockedOn === null); )
      Wm(a), a.blockedOn === null && tu.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[ht] || null;
        if (typeof n == "function")
          i || km(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[ht] || null)
              c = i.formAction;
            else if (bo(e) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[u + 1] = c : (a.splice(u, 3), u -= 3), km(a);
        }
      }
  }
  function Pm() {
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
  function Eo(l) {
    this._internalRoot = l;
  }
  Zi.prototype.render = Eo.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(h(409));
    var a = t.current, u = jt();
    Lm(a, u, l, t, null, null);
  }, Zi.prototype.unmount = Eo.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Lm(l.current, 2, null, l, null, null), Ai(), t[Cu] = null;
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
      tu.splice(a, 0, l), a === 0 && Wm(l);
    }
  };
  var ld = el.version;
  if (ld !== "19.3.0")
    throw Error(
      h(
        527,
        ld,
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
    var Vi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Vi.isDisabled && Vi.supportsFiber)
      try {
        Te = Vi.inject(
          nh
        ), Nt = Vi;
      } catch {
      }
  }
  return yn.createRoot = function(l, t) {
    if (!fl(l)) throw Error(h(299));
    var a = !1, u = "", e = Vr, n = Lr, i = Kr;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Zm(
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
      Pm
    ), l[Cu] = t.current, Wf(l), new Eo(t);
  }, yn.hydrateRoot = function(l, t, a) {
    if (!fl(l)) throw Error(h(299));
    var u = !1, e = "", n = Vr, i = Lr, c = Kr, f = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), t = Zm(
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
      Pm
    ), t.context = Vm(null), a = t.current, u = jt(), u = $i(u), e = Ga(u), e.callback = null, Xa(a, e, u), a = u, t.current.lanes = a, ze(t, a), ma(t), l[Cu] = t.current, Wf(l), new Zi(t);
  }, yn.version = "19.3.0", yn;
}
var sd;
function yh() {
  if (sd) return Oo.exports;
  sd = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (el) {
        console.error(el);
      }
  }
  return A(), Oo.exports = vh(), Oo.exports;
}
var hh = yh();
function gh(A = "/api") {
  async function el(X, h, fl) {
    const ol = await fetch(`${A.replace(/\/$/, "")}/${X}`, {
      ...h ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(h) } : {},
      signal: fl
    });
    if (!ol.ok) {
      const Rl = await ol.json().catch(() => ({}));
      throw new Error(Rl.error || `Erro HTTP ${ol.status}`);
    }
    return X === "export" ? ol.blob() : ol.json();
  }
  return { catalog: (X) => el("catalog", null, X), preview: (X, h) => el("preview", X, h), export: (X, h) => el("export", X, h) };
}
const rd = {
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
}, Mo = (A) => {
  try {
    return JSON.parse(A.detail) || {};
  } catch {
    return {};
  }
}, Co = (A) => {
  if (rd[A]) return rd[A];
  const el = String(A).replace(/^\d+_/, "").replaceAll("_", " ");
  return el.charAt(0).toLocaleUpperCase("pt-BR") + el.slice(1);
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
  let el = "";
  try {
    el = JSON.parse(A.detail).categorias || "";
  } catch {
    el = "";
  }
  const X = {};
  for (const h of String(el).split("|")) {
    const fl = h.indexOf(":");
    if (fl < 1) continue;
    const ol = h.slice(0, fl).trim(), Rl = h.slice(fl + 1).trim();
    ol && Rl && (X[ol] = Rl);
  }
  return X;
}
const hn = { fgb: 6500, gpkg: 1900, shp: 250, geojson: 6500 }, Uo = "__todas__";
function Eh({ apiBaseUrl: A = "/api", client: el, value: X, onChange: h, onExport: fl, download: ol = !0, className: Rl = "", categoriaNome: Ll = "", feedback: tl }) {
  const Al = Ml.useMemo(() => el || gh(A), [el, A]), [j, T] = Ml.useState(null), [H, Sl] = Ml.useState(0), [Cl, bl] = Ml.useState(""), [nl, xl] = Ml.useState(0), [$, Yl] = Ml.useState({ attributes: [], format: "fgb" }), Q = X ?? $, [Tl, Kl] = Ml.useState(""), [Z, il] = Ml.useState("2022"), [Il, nt] = Ml.useState(""), [it, ot] = Ml.useState(""), [st, Jt] = Ml.useState({}), [_l, N] = Ml.useState(0), [x, B] = Ml.useState(""), [k, sl] = Ml.useState(!1), [zt, yt] = Ml.useState(""), [Jl, s] = Ml.useState(null), _ = Ml.useRef(!0);
  Ml.useEffect(() => {
    _.current = !0;
    const S = new AbortController();
    return T(null), B(""), Al.catalog(S.signal).then((V) => {
      T(V), Kl(V.attributes.find((J) => J.source === "IBGE · Censo 2022")?.source || V.attributes[0]?.source || "");
    }).catch((V) => {
      V.name !== "AbortError" && (B(V.message), tl?.error(V.message, "Catálogo de indicadores"));
    }), () => {
      _.current = !1, S.abort();
    };
  }, [Al, H]);
  function R(S) {
    tl && S.attributes.length > hn[S.format] && (S.format !== Q.format || Q.attributes.length <= hn[Q.format]) && tl.warning("Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos.", "Formato da camada"), X === void 0 && Yl(S), h?.(S), yt("");
  }
  const M = j?.attributes || [], al = [...new Set(M.map((S) => S.source))], F = Tl === Uo, ul = [...new Set(M.filter((S) => F || S.source === Tl).map((S) => S.year))].sort((S, V) => V - S), U = F && Z === "", Y = U ? null : ul.includes(Number(Z)) ? Number(Z) : ul[0], xt = M.filter((S) => (F || S.source === Tl) && (U || S.year === Y)), Se = [...new Set(xt.map((S) => S.theme))], ct = new Set(Q.attributes), Bt = Ml.useMemo(() => {
    const S = M.filter((Dl) => ct.has(Dl.id));
    if (!S.length) return "Categoria — fonte majoritária — data da geração";
    const V = /* @__PURE__ */ new Map();
    for (const Dl of S) V.set(Dl.source, (V.get(Dl.source) || 0) + 1);
    const J = [...V.entries()].sort((Dl, ta) => ta[1] - Dl[1])[0][0];
    return `${Ll || "Categoria"} — ${J} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [M, Q.attributes, Ll]), Bl = M.filter((S) => ct.has(S.id)), vl = Ml.useMemo(() => new Map(M.map((S) => [S.id, Th(S)])), [M]), _t = xt.filter((S) => (!Il || S.theme === Il) && `${S.label} ${S.field} ${S.unit}`.toLocaleLowerCase("pt-BR").includes(it.toLocaleLowerCase("pt-BR"))), Ma = (S, V) => Object.entries(st).every(([J, Dl]) => !Dl || J === V || vl.get(S.id)?.[J] === Dl), la = (() => {
    if (!Il) return [];
    const S = /* @__PURE__ */ new Map();
    for (const V of _t) for (const [J, Dl] of Object.entries(vl.get(V.id) || {}))
      S.has(J) || S.set(J, /* @__PURE__ */ new Set()), Ma(V, J) && S.get(J).add(Dl);
    return [...S].map(([V, J]) => [V, [...J].sort((Dl, ta) => Dl.localeCompare(ta, "pt-BR", { numeric: !0 }))]).filter(([V, J]) => J.length > 1 || st[V]).sort((V, J) => V[0].localeCompare(J[0], "pt-BR"));
  })(), wt = _t.filter((S) => Ma(S, null)), uu = wt.slice(_l * 40, _l * 40 + 40);
  Ml.useEffect(() => {
    N(0);
  }, [Tl, Z, Il, it, st]), Ml.useEffect(() => {
    Jt({});
  }, [Tl, Z, Il]);
  const Ca = `${Q.format}|${[...Q.attributes].join(",")}`;
  Ml.useEffect(() => {
    if (s(null), bl(""), !Q.attributes.length || Q.attributes.length > hn[Q.format]) return;
    const S = new AbortController(), V = { attributes: Q.attributes, format: Q.format }, J = setTimeout(() => Al.preview(V, S.signal).then((Dl) => {
      S.signal.aborted || s(Dl);
    }).catch((Dl) => {
      S.signal.aborted || (bl(Dl.message), tl?.error(Dl.message, "Prévia dos indicadores"));
    }), 250);
    return () => {
      clearTimeout(J), S.abort();
    };
  }, [Al, Ca, nl]);
  function Du(S) {
    R({ ...Q, attributes: ct.has(S) ? Q.attributes.filter((V) => V !== S) : [...Q.attributes, S] });
  }
  async function Mu() {
    if (tl && !await tl.confirmar({ title: "Gerar camada territorial", message: `Gerar uma camada com ${Q.attributes.length} atributos dos 645 municípios de São Paulo?`, confirmLabel: "Gerar camada" })) return;
    const S = tl?.processo("Gerando camada territorial");
    S?.passo("Gerando a geometria e materializando os atributos selecionados…"), sl(!0), B(""), yt(j?.destino ? `Gerando geometria e tabela de atributos em ${j.destino}/` : "Gerando geometria e tabela de atributos…");
    const V = { ...Q, attributes: [...Q.attributes] };
    try {
      const J = await Al.export(V, S?.signal, S), Dl = `municipios_sp_${V.format}.zip`;
      if (await fl?.({ blob: J, filename: Dl, configuration: V, attributes: Bl }), ol) {
        const ta = URL.createObjectURL(J), be = document.createElement("a");
        be.href = ta, be.download = Dl, be.click(), setTimeout(() => URL.revokeObjectURL(ta), 1e4);
      }
      _.current && yt("Camada gerada. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT."), S?.concluir({ type: "success", message: "Camada gerada e disponível no acervo. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT." });
    } catch (J) {
      _.current && (B(J.message), yt("")), S?.concluir({ type: J.name === "AbortError" ? "info" : "error", message: J.message });
    } finally {
      _.current && sl(!1);
    }
  }
  return /* @__PURE__ */ b.jsxs("section", { className: `mlb ${Rl}`, "aria-label": "Gerador de camada municipal", children: [
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
    x && !tl && /* @__PURE__ */ b.jsx("div", { className: "mlb-error", role: "alert", children: x }),
    j ? /* @__PURE__ */ b.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ b.jsxs("select", { value: Tl, onChange: (S) => {
              Kl(S.target.value), nt(""), S.target.value === Uo && il("");
            }, children: [
              /* @__PURE__ */ b.jsx("option", { value: Uo, children: "Todas as fontes" }),
              al.map((S) => /* @__PURE__ */ b.jsx("option", { value: S, children: bh(S) }, S))
            ] })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ b.jsxs("select", { value: U ? "" : Y ?? "", onChange: (S) => {
              il(S.target.value), nt("");
            }, children: [
              F && /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os anos" }),
              ul.map((S) => /* @__PURE__ */ b.jsx("option", { children: S }, S))
            ] })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ b.jsxs("select", { value: Il, onChange: (S) => nt(S.target.value), children: [
              /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os temas" }),
              Se.map((S) => /* @__PURE__ */ b.jsx("option", { value: S, children: Co(S) }, S))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ b.jsx("input", { type: "search", value: it, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (S) => ot(S.target.value) })
          ] }),
          la.map(([S, V]) => /* @__PURE__ */ b.jsxs("label", { children: [
            S,
            /* @__PURE__ */ b.jsxs("select", { value: st[S] ?? "", onChange: (J) => Jt({ ...st, [S]: J.target.value }), children: [
              /* @__PURE__ */ b.jsxs("option", { value: "", children: [
                "Todos (",
                V.length,
                ")"
              ] }),
              V.map((J) => /* @__PURE__ */ b.jsx("option", { value: J, children: J }, J))
            ] })
          ] }, S)),
          !!Object.values(st).filter(Boolean).length && /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => Jt({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ b.jsxs("span", { children: [
            wt.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ b.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !wt.length || k, onClick: () => R({ ...Q, attributes: [.../* @__PURE__ */ new Set([...Q.attributes, ...wt.map((S) => S.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !ct.size || k, onClick: () => R({ ...Q, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-attributes", children: [
          uu.map((S) => /* @__PURE__ */ b.jsxs("article", { className: ct.has(S.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ b.jsxs("label", { children: [
              /* @__PURE__ */ b.jsx("input", { type: "checkbox", checked: ct.has(S.id), disabled: k, onChange: () => Du(S.id) }),
              /* @__PURE__ */ b.jsx("strong", { children: S.label })
            ] }),
            /* @__PURE__ */ b.jsxs("details", { children: [
              /* @__PURE__ */ b.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ b.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ b.jsxs("p", { className: "mlb-detail-meta", children: [
                  Co(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ b.jsxs("p", { children: [
                  F ? `${S.source} · ` : "",
                  S.field,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ b.jsx("a", { href: S.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ b.jsx("p", { children: Mo(S).definicao || Mo(S).divulgacao || "" }),
                /* @__PURE__ */ b.jsx("p", { children: Mo(S).nota || "" })
              ] })
            ] })
          ] }, S.id)),
          !uu.length && /* @__PURE__ */ b.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ b.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !_l, onClick: () => N(_l - 1), children: "Anterior" }),
          /* @__PURE__ */ b.jsxs("span", { children: [
            "Página ",
            _l + 1,
            " de ",
            Math.max(1, Math.ceil(wt.length / 40))
          ] }),
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: (_l + 1) * 40 >= wt.length, onClick: () => N(_l + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ b.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ b.jsx("strong", { children: Q.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ b.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ b.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-basket", children: [
          Bl.map((S) => /* @__PURE__ */ b.jsxs("article", { className: "mlb-basket-item", children: [
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
                  Co(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ b.jsx("p", { children: S.field })
              ] })
            ] }),
            /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: k, title: `Remover ${S.label}`, "aria-label": `Remover ${S.label}`, onClick: () => Du(S.id), children: "×" })
          ] }, S.id)),
          !Bl.length && /* @__PURE__ */ b.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ b.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ b.jsxs("select", { disabled: k, value: Q.format, onChange: (S) => R({ ...Q, format: S.target.value }), children: [
            /* @__PURE__ */ b.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ b.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ b.jsx("option", { value: "shp", children: "Shapefile (.shp)" }),
            /* @__PURE__ */ b.jsx("option", { value: "geojson", children: "GeoJSON (.geojson)" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("p", { className: "mlb-note", children: [
          Q.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : Q.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP com relatório do join, glossário e tabela em CSV, XLSX e TXT."
        ] }),
        /* @__PURE__ */ b.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ b.jsx("input", { type: "text", maxLength: 200, disabled: k, value: Q.nome ?? "", placeholder: Bt, onChange: (S) => R({ ...Q, nome: S.target.value }) })
        ] }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        !tl && ct.size > hn[Q.format] && /* @__PURE__ */ b.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-primary", disabled: k || !ct.size || ct.size > hn[Q.format], onClick: Mu, children: k ? "Gerando camada…" : ol ? "Gerar e baixar camada" : "Gerar camada" }),
        !tl && /* @__PURE__ */ b.jsx("p", { className: "mlb-status", role: "status", children: zt }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      Cl && /* @__PURE__ */ b.jsxs("div", { className: tl ? "mlb-preview" : "mlb-error mlb-preview", children: [
        !tl && /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
          "Prévia indisponível: ",
          Cl,
          " "
        ] }),
        /* @__PURE__ */ b.jsx("button", { type: "button", onClick: () => xl((S) => S + 1), children: "Tentar novamente" })
      ] }),
      Jl && /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel mlb-preview", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "Prévia da tabela de atributos" }),
        /* @__PURE__ */ b.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
        /* @__PURE__ */ b.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ b.jsxs("table", { "data-table-sort": "off", children: [
          /* @__PURE__ */ b.jsx("thead", { children: /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("th", { children: "Código IBGE" }),
            /* @__PURE__ */ b.jsx("th", { children: "Município" }),
            Jl.fields.map((S) => /* @__PURE__ */ b.jsx("th", { children: S }, S))
          ] }) }),
          /* @__PURE__ */ b.jsx("tbody", { children: Jl.rows.map((S) => /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("td", { children: S.CD_MUN }),
            /* @__PURE__ */ b.jsx("td", { children: S.NM_MUN }),
            Jl.fields.map((V) => /* @__PURE__ */ b.jsx("td", { children: S[V] == null ? "Sem valor" : S[V].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, V))
          ] }, S.CD_MUN)) })
        ] }) })
      ] }),
      Jl?.glossario?.length ? /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel mlb-glossario", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "Glossário e aliases de atributos" }),
        /* @__PURE__ */ b.jsxs("p", { children: [
          "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
          Jl.totalAttributes > (Jl.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${Jl.glossarioLimite} de ${Jl.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
        ] }),
        /* @__PURE__ */ b.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ b.jsxs("table", { "data-table-sort": "off", children: [
          /* @__PURE__ */ b.jsx("thead", { children: /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("th", { children: "Campo exportado" }),
            /* @__PURE__ */ b.jsx("th", { children: "Alias" }),
            /* @__PURE__ */ b.jsx("th", { children: "Significado" }),
            /* @__PURE__ */ b.jsx("th", { children: "Fonte" })
          ] }) }),
          /* @__PURE__ */ b.jsx("tbody", { children: Jl.glossario.map((S) => /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("td", { children: /* @__PURE__ */ b.jsx("code", { children: S.campo_exportado }) }),
            /* @__PURE__ */ b.jsx("td", { children: S.alias }),
            /* @__PURE__ */ b.jsx("td", { className: "mlb-glossario-significado", children: S.significado }),
            /* @__PURE__ */ b.jsx("td", { children: S.fonte })
          ] }, S.campo_exportado)) })
        ] }) })
      ] }) : null
    ] }) : /* @__PURE__ */ b.jsx("p", { role: "status", children: x ? /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
      "Não foi possível carregar o catálogo. ",
      /* @__PURE__ */ b.jsx("button", { type: "button", onClick: () => Sl((S) => S + 1), children: "Tentar novamente" })
    ] }) : "Carregando catálogo…" })
  ] });
}
function zh(A, { category: el, apiBase: X, onGenerated: h, onBusyChange: fl = () => {
}, configuration: ol, onChange: Rl = () => {
} }) {
  const Ll = hh.createRoot(A);
  function tl() {
    const [Al, j] = Ml.useState(ol || { attributes: [], format: "fgb" }), T = Ml.useMemo(() => {
      let Sl;
      async function Cl(bl, nl, xl) {
        let $;
        try {
          $ = await fetch(`${X}/extracao-atributos/municipal/${encodeURIComponent(el.id)}/${bl}`, {
            credentials: "same-origin",
            ...nl ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nl) } : {},
            signal: xl
          });
        } catch (Yl) {
          throw Yl.name === "AbortError" ? Yl : new Error("A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.");
        }
        if (!$.ok) {
          const Yl = await $.json().catch(() => ({}));
          throw $.status === 401 ? new Error("Sua sessão expirou. Entre novamente para continuar.") : new Error(typeof Yl.detail == "string" ? Yl.detail : `Não foi possível concluir a operação (HTTP ${$.status}).`);
        }
        return bl === "export" || bl.endsWith("/pacote") ? (Sl = { arquivo: $.headers.get("X-Camada-Arquivo"), id: $.headers.get("X-Camada-Id") }, $.blob()) : $.json();
      }
      return {
        catalog: (bl) => Cl("catalog", null, bl),
        preview: (bl, nl) => Cl("preview", bl, nl),
        export: async (bl, nl, xl) => {
          fl(!0);
          try {
            let $ = await Cl("jobs", { ...bl, nome: bl.nome || "" });
            const Yl = `jobs/${$.id}`, Q = async () => {
              await Cl(`${Yl}/cancelar`, {});
              let Tl = $;
              for (; Tl.status === "executando"; )
                await new Promise((Kl) => setTimeout(Kl, 500)), Tl = await Cl(Yl), xl?.acompanhar(Tl);
              if (Tl.status !== "cancelado") throw new Error(Tl.erro || "A gravação já terminou. Consulte o acervo.");
            };
            for (; $.status === "executando"; )
              xl?.acompanhar($), xl?.definirCancelamento($.cancelavel ? Q : null, "A gravação final já começou. Aguarde sua conclusão."), await new Promise((Tl) => setTimeout(Tl, 500)), $ = await Cl(Yl);
            if (xl?.acompanhar($), $.status === "cancelado") {
              const Tl = new Error("Geração cancelada. Sua seleção foi mantida.");
              throw Tl.name = "AbortError", Tl;
            }
            if ($.status !== "concluido") throw new Error($.erro || "Não foi possível gerar a camada.");
            return await Cl(`${Yl}/pacote`);
          } catch ($) {
            throw fl(!1), $;
          }
        },
        generated: () => Sl
      };
    }, []);
    async function H(Sl) {
      try {
        await h(T.generated(), Sl);
      } finally {
        fl(!1);
      }
    }
    return /* @__PURE__ */ b.jsx(Eh, { value: Al, onChange: (Sl) => {
      j(Sl), Rl(Sl);
    }, client: T, download: !1, onExport: H, categoriaNome: el.nome, feedback: window.SLTFeedback });
  }
  return Ll.render(/* @__PURE__ */ b.jsx(tl, {})), () => Ll.unmount();
}
export {
  zh as montarMunicipal
};
