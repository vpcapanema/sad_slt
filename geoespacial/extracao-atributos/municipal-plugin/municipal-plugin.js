var bo = { exports: {} }, en = {};
var Im;
function nh() {
  if (Im) return en;
  Im = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), el = /* @__PURE__ */ Symbol.for("react.fragment");
  function V(y, nl, tl) {
    var gl = null;
    if (tl !== void 0 && (gl = "" + tl), nl.key !== void 0 && (gl = "" + nl.key), "key" in nl) {
      tl = {};
      for (var Ul in nl)
        Ul !== "key" && (tl[Ul] = nl[Ul]);
    } else tl = nl;
    return nl = tl.ref, {
      $$typeof: A,
      type: y,
      key: gl,
      ref: nl !== void 0 ? nl : null,
      props: tl
    };
  }
  return en.Fragment = el, en.jsx = V, en.jsxs = V, en;
}
var km;
function ih() {
  return km || (km = 1, bo.exports = nh()), bo.exports;
}
var z = ih(), To = { exports: {} }, X = {};
var Pm;
function fh() {
  if (Pm) return X;
  Pm = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), el = /* @__PURE__ */ Symbol.for("react.portal"), V = /* @__PURE__ */ Symbol.for("react.fragment"), y = /* @__PURE__ */ Symbol.for("react.strict_mode"), nl = /* @__PURE__ */ Symbol.for("react.profiler"), tl = /* @__PURE__ */ Symbol.for("react.consumer"), gl = /* @__PURE__ */ Symbol.for("react.context"), Ul = /* @__PURE__ */ Symbol.for("react.forward_ref"), zl = /* @__PURE__ */ Symbol.for("react.suspense"), _l = /* @__PURE__ */ Symbol.for("react.memo"), x = /* @__PURE__ */ Symbol.for("react.lazy"), S = /* @__PURE__ */ Symbol.for("react.activity"), D = /* @__PURE__ */ Symbol.for("react.view_transition"), Sl = Symbol.iterator;
  function Zl(s) {
    return s === null || typeof s != "object" ? null : (s = Sl && s[Sl] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var Ol = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, fl = Object.assign, yl = {};
  function Nl(s, _, R) {
    this.props = s, this.context = _, this.refs = yl, this.updater = R || Ol;
  }
  Nl.prototype.isReactComponent = {}, Nl.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, Nl.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function gt() {
  }
  gt.prototype = Nl.prototype;
  function Xl(s, _, R) {
    this.props = s, this.context = _, this.refs = yl, this.updater = R || Ol;
  }
  var jl = Xl.prototype = new gt();
  jl.constructor = Xl, fl(jl, Nl.prototype), jl.isPureReactComponent = !0;
  var $l = Array.isArray;
  function Q() {
  }
  var P = { H: null, A: null, T: null, S: null }, st = Object.prototype.hasOwnProperty;
  function Vl(s, _, R) {
    var H = R.ref;
    return {
      $$typeof: A,
      type: s,
      key: _,
      ref: H !== void 0 ? H : null,
      props: R
    };
  }
  function xl(s, _) {
    return Vl(s.type, _, s.props);
  }
  function ut(s) {
    return typeof s == "object" && s !== null && s.$$typeof === A;
  }
  function wt(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(R) {
      return _[R];
    });
  }
  var Ut = /\/+/g;
  function Dl(s, _) {
    return typeof s == "object" && s !== null && s.key != null ? wt("" + s.key) : _.toString(36);
  }
  function N(s) {
    switch (s.status) {
      case "fulfilled":
        return s.value;
      case "rejected":
        throw s.reason;
      default:
        switch (typeof s.status == "string" ? s.then(Q, Q) : (s.status = "pending", s.then(
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
  function j(s, _, R, H, F) {
    var ll = typeof s;
    (ll === "undefined" || ll === "boolean") && (s = null);
    var il = !1;
    if (s === null) il = !0;
    else
      switch (ll) {
        case "bigint":
        case "string":
        case "number":
          il = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case A:
            case el:
              il = !0;
              break;
            case x:
              return il = s._init, j(
                il(s._payload),
                _,
                R,
                H,
                F
              );
          }
      }
    if (il)
      return F = F(s), il = H === "" ? "." + Dl(s, 0) : H, $l(F) ? (R = "", il != null && (R = il.replace(Ut, "$&/") + "/"), j(F, _, R, "", function(Rt) {
        return Rt;
      })) : F != null && (ut(F) && (F = xl(
        F,
        R + (F.key == null || s && s.key === F.key ? "" : ("" + F.key).replace(
          Ut,
          "$&/"
        ) + "/") + il
      )), _.push(F)), 1;
    il = 0;
    var U = H === "" ? "." : H + ":";
    if ($l(s))
      for (var Y = 0; Y < s.length; Y++)
        H = s[Y], ll = U + Dl(H, Y), il += j(
          H,
          _,
          R,
          ll,
          F
        );
    else if (Y = Zl(s), typeof Y == "function")
      for (s = Y.call(s), Y = 0; !(H = s.next()).done; )
        H = H.value, ll = U + Dl(H, Y++), il += j(
          H,
          _,
          R,
          ll,
          F
        );
    else if (ll === "object") {
      if (typeof s.then == "function")
        return j(
          N(s),
          _,
          R,
          H,
          F
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return il;
  }
  function B(s, _, R) {
    if (s == null) return s;
    var H = [], F = 0;
    return j(s, H, "", "", function(ll) {
      return _.call(R, ll, F++);
    }), H;
  }
  function ul(s) {
    if (s._status === -1) {
      var _ = s._result, R = _();
      R.then(
        function(H) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = H, R.status === void 0 && (R.status = "fulfilled", R.value = H));
        },
        function(H) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = H, R.status === void 0 && (R.status = "rejected", R.reason = H));
        }
      ), s._status === -1 && (s._status = 0, s._result = R);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var cl = typeof reportError == "function" ? reportError : function(s) {
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
    var _ = P.T, R = {};
    R.types = _ !== null ? _.types : null, P.T = R;
    try {
      var H = s(), F = P.S;
      F !== null && F(R, H), typeof H == "object" && H !== null && typeof H.then == "function" && H.then(Q, cl);
    } catch (ll) {
      cl(ll);
    } finally {
      _ !== null && R.types !== null && (_.types = R.types), P.T = _;
    }
  }
  function Ct(s) {
    var _ = P.T;
    if (_ !== null) {
      var R = _.types;
      R === null ? _.types = [s] : R.indexOf(s) === -1 && R.push(s);
    } else nt(Ct.bind(null, s));
  }
  var $t = {
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
      if (!ut(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return X.Activity = S, X.Children = $t, X.Component = Nl, X.Fragment = V, X.Profiler = nl, X.PureComponent = Xl, X.StrictMode = y, X.Suspense = zl, X.ViewTransition = D, X.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = P, X.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return P.H.useMemoCache(s);
    }
  }, X.addTransitionType = Ct, X.cache = function(s) {
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
    var H = fl({}, s.props), F = s.key;
    if (_ != null)
      for (ll in _.key !== void 0 && (F = "" + _.key), _)
        !st.call(_, ll) || ll === "key" || ll === "__self" || ll === "__source" || ll === "ref" && _.ref === void 0 || (H[ll] = _[ll]);
    var ll = arguments.length - 2;
    if (ll === 1) H.children = R;
    else if (1 < ll) {
      for (var il = Array(ll), U = 0; U < ll; U++)
        il[U] = arguments[U + 2];
      H.children = il;
    }
    return Vl(s.type, F, H);
  }, X.createContext = function(s) {
    return s = {
      $$typeof: gl,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: tl,
      _context: s
    }, s;
  }, X.createElement = function(s, _, R) {
    var H, F = {}, ll = null;
    if (_ != null)
      for (H in _.key !== void 0 && (ll = "" + _.key), _)
        st.call(_, H) && H !== "key" && H !== "__self" && H !== "__source" && (F[H] = _[H]);
    var il = arguments.length - 2;
    if (il === 1) F.children = R;
    else if (1 < il) {
      for (var U = Array(il), Y = 0; Y < il; Y++)
        U[Y] = arguments[Y + 2];
      F.children = U;
    }
    if (s && s.defaultProps)
      for (H in il = s.defaultProps, il)
        F[H] === void 0 && (F[H] = il[H]);
    return Vl(s, ll, F);
  }, X.createRef = function() {
    return { current: null };
  }, X.forwardRef = function(s) {
    return { $$typeof: Ul, render: s };
  }, X.isValidElement = ut, X.lazy = function(s) {
    return {
      $$typeof: x,
      _payload: { _status: -1, _result: s },
      _init: ul
    };
  }, X.memo = function(s, _) {
    return {
      $$typeof: _l,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, X.startTransition = nt, X.unstable_useCacheRefresh = function() {
    return P.H.useCacheRefresh();
  }, X.use = function(s) {
    return P.H.use(s);
  }, X.useActionState = function(s, _, R) {
    return P.H.useActionState(s, _, R);
  }, X.useCallback = function(s, _) {
    return P.H.useCallback(s, _);
  }, X.useContext = function(s) {
    return P.H.useContext(s);
  }, X.useDebugValue = function() {
  }, X.useDeferredValue = function(s, _) {
    return P.H.useDeferredValue(s, _);
  }, X.useEffect = function(s, _) {
    return P.H.useEffect(s, _);
  }, X.useEffectEvent = function(s) {
    return P.H.useEffectEvent(s);
  }, X.useId = function() {
    return P.H.useId();
  }, X.useImperativeHandle = function(s, _, R) {
    return P.H.useImperativeHandle(s, _, R);
  }, X.useInsertionEffect = function(s, _) {
    return P.H.useInsertionEffect(s, _);
  }, X.useLayoutEffect = function(s, _) {
    return P.H.useLayoutEffect(s, _);
  }, X.useMemo = function(s, _) {
    return P.H.useMemo(s, _);
  }, X.useOptimistic = function(s, _) {
    return P.H.useOptimistic(s, _);
  }, X.useReducer = function(s, _, R) {
    return P.H.useReducer(s, _, R);
  }, X.useRef = function(s) {
    return P.H.useRef(s);
  }, X.useState = function(s) {
    return P.H.useState(s);
  }, X.useSyncExternalStore = function(s, _, R) {
    return P.H.useSyncExternalStore(
      s,
      _,
      R
    );
  }, X.useTransition = function() {
    return P.H.useTransition();
  }, X.version = "19.3.0", X;
}
var ld;
function Ao() {
  return ld || (ld = 1, To.exports = fh()), To.exports;
}
var Hl = Ao(), Eo = { exports: {} }, nn = {}, zo = { exports: {} }, _o = {};
var td;
function ch() {
  return td || (td = 1, (function(A) {
    function el(N, j) {
      var B = N.length;
      N.push(j);
      l: for (; 0 < B; ) {
        var ul = B - 1 >>> 1, cl = N[ul];
        if (0 < nl(cl, j))
          N[ul] = j, N[B] = cl, B = ul;
        else break l;
      }
    }
    function V(N) {
      return N.length === 0 ? null : N[0];
    }
    function y(N) {
      if (N.length === 0) return null;
      var j = N[0], B = N.pop();
      if (B !== j) {
        N[0] = B;
        l: for (var ul = 0, cl = N.length, nt = cl >>> 1; ul < nt; ) {
          var Ct = 2 * (ul + 1) - 1, $t = N[Ct], s = Ct + 1, _ = N[s];
          if (0 > nl($t, B))
            s < cl && 0 > nl(_, $t) ? (N[ul] = _, N[s] = B, ul = s) : (N[ul] = $t, N[Ct] = B, ul = Ct);
          else if (s < cl && 0 > nl(_, B))
            N[ul] = _, N[s] = B, ul = s;
          else break l;
        }
      }
      return j;
    }
    function nl(N, j) {
      var B = N.sortIndex - j.sortIndex;
      return B !== 0 ? B : N.id - j.id;
    }
    if (A.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var tl = performance;
      A.unstable_now = function() {
        return tl.now();
      };
    } else {
      var gl = Date, Ul = gl.now();
      A.unstable_now = function() {
        return gl.now() - Ul;
      };
    }
    var zl = [], _l = [], x = 1, S = null, D = 3, Sl = !1, Zl = !1, Ol = !1, fl = !1, yl = typeof setTimeout == "function" ? setTimeout : null, Nl = typeof clearTimeout == "function" ? clearTimeout : null, gt = typeof setImmediate < "u" ? setImmediate : null;
    function Xl(N) {
      for (var j = V(_l); j !== null; ) {
        if (j.callback === null) y(_l);
        else if (j.startTime <= N)
          y(_l), j.sortIndex = j.expirationTime, el(zl, j);
        else break;
        j = V(_l);
      }
    }
    function jl(N) {
      if (Ol = !1, Xl(N), !Zl)
        if (V(zl) !== null)
          Zl = !0, $l || ($l = !0, ut());
        else {
          var j = V(_l);
          j !== null && Dl(jl, j.startTime - N);
        }
    }
    var $l = !1, Q = -1, P = 5, st = -1;
    function Vl() {
      return fl ? !0 : !(A.unstable_now() - st < P);
    }
    function xl() {
      if (fl = !1, $l) {
        var N = A.unstable_now();
        st = N;
        var j = !0;
        try {
          l: {
            Zl = !1, Ol && (Ol = !1, Nl(Q), Q = -1), Sl = !0;
            var B = D;
            try {
              t: {
                for (Xl(N), S = V(zl); S !== null && !(S.expirationTime > N && Vl()); ) {
                  var ul = S.callback;
                  if (typeof ul == "function") {
                    S.callback = null, D = S.priorityLevel;
                    var cl = ul(
                      S.expirationTime <= N
                    );
                    if (N = A.unstable_now(), typeof cl == "function") {
                      S.callback = cl, Xl(N), j = !0;
                      break t;
                    }
                    S === V(zl) && y(zl), Xl(N);
                  } else y(zl);
                  S = V(zl);
                }
                if (S !== null) j = !0;
                else {
                  var nt = V(_l);
                  nt !== null && Dl(
                    jl,
                    nt.startTime - N
                  ), j = !1;
                }
              }
              break l;
            } finally {
              S = null, D = B, Sl = !1;
            }
            j = void 0;
          }
        } finally {
          j ? ut() : $l = !1;
        }
      }
    }
    var ut;
    if (typeof gt == "function")
      ut = function() {
        gt(xl);
      };
    else if (typeof MessageChannel < "u") {
      var wt = new MessageChannel(), Ut = wt.port2;
      wt.port1.onmessage = xl, ut = function() {
        Ut.postMessage(null);
      };
    } else
      ut = function() {
        yl(xl, 0);
      };
    function Dl(N, j) {
      Q = yl(function() {
        N(A.unstable_now());
      }, j);
    }
    A.unstable_IdlePriority = 5, A.unstable_ImmediatePriority = 1, A.unstable_LowPriority = 4, A.unstable_NormalPriority = 3, A.unstable_Profiling = null, A.unstable_UserBlockingPriority = 2, A.unstable_cancelCallback = function(N) {
      N.callback = null;
    }, A.unstable_forceFrameRate = function(N) {
      0 > N || 125 < N ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : P = 0 < N ? Math.floor(1e3 / N) : 5;
    }, A.unstable_getCurrentPriorityLevel = function() {
      return D;
    }, A.unstable_next = function(N) {
      switch (D) {
        case 1:
        case 2:
        case 3:
          var j = 3;
          break;
        default:
          j = D;
      }
      var B = D;
      D = j;
      try {
        return N();
      } finally {
        D = B;
      }
    }, A.unstable_requestPaint = function() {
      fl = !0;
    }, A.unstable_runWithPriority = function(N, j) {
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
      var B = D;
      D = N;
      try {
        return j();
      } finally {
        D = B;
      }
    }, A.unstable_scheduleCallback = function(N, j, B) {
      var ul = A.unstable_now();
      switch (typeof B == "object" && B !== null ? (B = B.delay, B = typeof B == "number" && 0 < B ? ul + B : ul) : B = ul, N) {
        case 1:
          var cl = -1;
          break;
        case 2:
          cl = 250;
          break;
        case 5:
          cl = 1073741823;
          break;
        case 4:
          cl = 1e4;
          break;
        default:
          cl = 5e3;
      }
      return cl = B + cl, N = {
        id: x++,
        callback: j,
        priorityLevel: N,
        startTime: B,
        expirationTime: cl,
        sortIndex: -1
      }, B > ul ? (N.sortIndex = B, el(_l, N), V(zl) === null && N === V(_l) && (Ol ? (Nl(Q), Q = -1) : Ol = !0, Dl(jl, B - ul))) : (N.sortIndex = cl, el(zl, N), Zl || Sl || (Zl = !0, $l || ($l = !0, ut()))), N;
    }, A.unstable_shouldYield = Vl, A.unstable_wrapCallback = function(N) {
      var j = D;
      return function() {
        var B = D;
        D = j;
        try {
          return N.apply(this, arguments);
        } finally {
          D = B;
        }
      };
    };
  })(_o)), _o;
}
var ud;
function oh() {
  return ud || (ud = 1, zo.exports = ch()), zo.exports;
}
var Oo = { exports: {} }, tt = {};
var ad;
function sh() {
  if (ad) return tt;
  ad = 1;
  var A = Ao();
  function el(x) {
    var S = "https://react.dev/errors/" + x;
    if (1 < arguments.length) {
      S += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var D = 2; D < arguments.length; D++)
        S += "&args[]=" + encodeURIComponent(arguments[D]);
    }
    return "Minified React error #" + x + "; visit " + S + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function V() {
  }
  var y = {
    d: {
      f: V,
      r: function() {
        throw Error(el(522));
      },
      D: V,
      C: V,
      L: V,
      m: V,
      X: V,
      S: V,
      M: V
    },
    p: 0,
    findDOMNode: null
  }, nl = /* @__PURE__ */ Symbol.for("react.portal"), tl = /* @__PURE__ */ Symbol.for("react.recoverable"), gl = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function Ul(x, S, D) {
    var Sl = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: nl,
      key: Sl == null ? null : Sl === gl ? gl : "" + Sl,
      children: x,
      containerInfo: S,
      implementation: D
    };
  }
  var zl = A.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function _l(x, S) {
    if (x === "font") return "";
    if (typeof S == "string")
      return S === "use-credentials" ? S : "";
  }
  return tt.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = y, tt.browser = function(x) {
    return { $$typeof: tl, _reason: x };
  }, tt.createPortal = function(x, S) {
    var D = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!S || S.nodeType !== 1 && S.nodeType !== 9 && S.nodeType !== 11)
      throw Error(el(299));
    return Ul(x, S, null, D);
  }, tt.flushSync = function(x) {
    var S = zl.T, D = y.p;
    try {
      if (zl.T = null, y.p = 2, x) return x();
    } finally {
      zl.T = S, y.p = D, y.d.f();
    }
  }, tt.preconnect = function(x, S) {
    typeof x == "string" && (S ? (S = S.crossOrigin, S = typeof S == "string" ? S === "use-credentials" ? S : "" : void 0) : S = null, y.d.C(x, S));
  }, tt.prefetchDNS = function(x) {
    typeof x == "string" && y.d.D(x);
  }, tt.preinit = function(x, S) {
    if (typeof x == "string" && S && typeof S.as == "string") {
      var D = S.as, Sl = _l(D, S.crossOrigin), Zl = typeof S.integrity == "string" ? S.integrity : void 0, Ol = typeof S.fetchPriority == "string" ? S.fetchPriority : void 0;
      D === "style" ? y.d.S(
        x,
        typeof S.precedence == "string" ? S.precedence : void 0,
        {
          crossOrigin: Sl,
          integrity: Zl,
          fetchPriority: Ol
        }
      ) : D === "script" && y.d.X(x, {
        crossOrigin: Sl,
        integrity: Zl,
        fetchPriority: Ol,
        nonce: typeof S.nonce == "string" ? S.nonce : void 0
      });
    }
  }, tt.preinitModule = function(x, S) {
    if (typeof x == "string")
      if (typeof S == "object" && S !== null) {
        if (S.as == null || S.as === "script") {
          var D = _l(
            S.as,
            S.crossOrigin
          );
          y.d.M(x, {
            crossOrigin: D,
            integrity: typeof S.integrity == "string" ? S.integrity : void 0,
            nonce: typeof S.nonce == "string" ? S.nonce : void 0,
            fetchPriority: typeof S.fetchPriority == "string" ? S.fetchPriority : void 0
          });
        }
      } else S == null && y.d.M(x);
  }, tt.preload = function(x, S) {
    if (typeof x == "string" && typeof S == "object" && S !== null && typeof S.as == "string") {
      var D = S.as, Sl = _l(D, S.crossOrigin);
      y.d.L(x, D, {
        crossOrigin: Sl,
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
  }, tt.preloadModule = function(x, S) {
    if (typeof x == "string")
      if (S) {
        var D = _l(S.as, S.crossOrigin);
        y.d.m(x, {
          as: typeof S.as == "string" && S.as !== "script" ? S.as : void 0,
          crossOrigin: D,
          integrity: typeof S.integrity == "string" ? S.integrity : void 0,
          nonce: typeof S.nonce == "string" ? S.nonce : void 0,
          fetchPriority: typeof S.fetchPriority == "string" ? S.fetchPriority : void 0
        });
      } else y.d.m(x);
  }, tt.requestFormReset = function(x) {
    y.d.r(x);
  }, tt.unstable_batchedUpdates = function(x, S) {
    return x(S);
  }, tt.useFormState = function(x, S, D) {
    return zl.H.useFormState(x, S, D);
  }, tt.useFormStatus = function() {
    return zl.H.useHostTransitionStatus();
  }, tt.version = "19.3.0", tt;
}
var ed;
function vh() {
  if (ed) return Oo.exports;
  ed = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (el) {
        console.error(el);
      }
  }
  return A(), Oo.exports = sh(), Oo.exports;
}
var nd;
function mh() {
  if (nd) return nn;
  nd = 1;
  var A = oh(), el = Ao(), V = vh();
  function y(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var u = 2; u < arguments.length; u++)
        t += "&args[]=" + encodeURIComponent(arguments[u]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function nl(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function tl(l) {
    for (var t = l, u = t; u && !u.alternate; )
      t = u, (t.flags & 4098) !== 0 && (l = t.return), u = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function gl(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Ul(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function zl(l) {
    if (tl(l) !== l)
      throw Error(y(188));
  }
  function _l(l) {
    var t = l.alternate;
    if (!t) {
      if (t = tl(l), t === null) throw Error(y(188));
      return t !== l ? null : l;
    }
    for (var u = l, a = t; ; ) {
      var e = u.return;
      if (e === null) break;
      var n = e.alternate;
      if (n === null) {
        if (a = e.return, a !== null) {
          u = a;
          continue;
        }
        break;
      }
      if (e.child === n.child) {
        for (n = e.child; n; ) {
          if (n === u) return zl(e), l;
          if (n === a) return zl(e), t;
          n = n.sibling;
        }
        throw Error(y(188));
      }
      if (u.return !== a.return) u = e, a = n;
      else {
        for (var i = !1, f = e.child; f; ) {
          if (f === u) {
            i = !0, u = e, a = n;
            break;
          }
          if (f === a) {
            i = !0, a = e, u = n;
            break;
          }
          f = f.sibling;
        }
        if (!i) {
          for (f = n.child; f; ) {
            if (f === u) {
              i = !0, u = n, a = e;
              break;
            }
            if (f === a) {
              i = !0, a = n, u = e;
              break;
            }
            f = f.sibling;
          }
          if (!i) throw Error(y(189));
        }
      }
      if (u.alternate !== a) throw Error(y(190));
    }
    if (u.tag !== 3) throw Error(y(188));
    return u.stateNode.current === u ? l : t;
  }
  function x(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = x(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  function S(l, t, u, a, e, n) {
    for (; l !== null; ) {
      if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && u(l, a, e, n) || (l.tag !== 22 || l.memoizedState === null) && (t || l.tag !== 5 && l.tag !== 27) && S(
        l.child,
        t,
        u,
        a,
        e,
        n
      ))
        return !0;
      l = l.sibling;
    }
    return !1;
  }
  function D(l) {
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
  function Zl(l) {
    var t = [null, null], u = D(l);
    return u === null || Ol(
      t,
      l,
      u.child,
      { foundSelf: !1 }
    ), t;
  }
  function Ol(l, t, u, a) {
    for (; u !== null; ) {
      if (u === t) a.foundSelf = !0;
      else if (u.tag === 5 || u.tag === 27 || u.tag === 6) {
        if (a.foundSelf) return l[1] = u, !0;
        l[0] = u;
      } else if ((u.tag !== 22 || u.memoizedState === null) && Ol(
        l,
        t,
        u.child,
        a
      ))
        return !0;
      u = u.sibling;
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
        throw Error(y(559));
    }
  }
  var yl = null, Nl = null;
  function gt(l, t, u) {
    return l === u ? !0 : l === t ? (yl = l, !0) : !1;
  }
  function Xl(l, t, u) {
    return l === u ? (Nl = l, !1) : l === t ? (Nl !== null && (yl = l), !0) : !1;
  }
  function jl(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function $l(l, t, u) {
    for (var a = 0, e = l; e; e = u(e)) a++;
    e = 0;
    for (var n = t; n; n = u(n)) e++;
    for (; 0 < a - e; ) l = u(l), a--;
    for (; 0 < e - a; ) t = u(t), e--;
    for (; a--; ) {
      if (l === t || t !== null && l === t.alternate)
        return l;
      l = u(l), t = u(t);
    }
    return null;
  }
  var Q = Object.assign, P = /* @__PURE__ */ Symbol.for("react.element"), st = /* @__PURE__ */ Symbol.for("react.transitional.element"), Vl = /* @__PURE__ */ Symbol.for("react.portal"), xl = /* @__PURE__ */ Symbol.for("react.fragment"), ut = /* @__PURE__ */ Symbol.for("react.strict_mode"), wt = /* @__PURE__ */ Symbol.for("react.profiler"), Ut = /* @__PURE__ */ Symbol.for("react.consumer"), Dl = /* @__PURE__ */ Symbol.for("react.context"), N = /* @__PURE__ */ Symbol.for("react.forward_ref"), j = /* @__PURE__ */ Symbol.for("react.suspense"), B = /* @__PURE__ */ Symbol.for("react.suspense_list"), ul = /* @__PURE__ */ Symbol.for("react.memo"), cl = /* @__PURE__ */ Symbol.for("react.lazy"), nt = /* @__PURE__ */ Symbol.for("react.activity"), Ct = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), $t = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), R = Symbol.iterator;
  function H(l) {
    return l === null || typeof l != "object" ? null : (l = R && l[R] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var F = /* @__PURE__ */ Symbol.for("react.client.reference");
  function ll(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === F ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case xl:
        return "Fragment";
      case wt:
        return "Profiler";
      case ut:
        return "StrictMode";
      case j:
        return "Suspense";
      case B:
        return "SuspenseList";
      case nt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case Vl:
          return "Portal";
        case Dl:
          return l.displayName || "Context";
        case Ut:
          return (l._context.displayName || "Context") + ".Consumer";
        case N:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case ul:
          return t = l.displayName || null, t !== null ? t : ll(l.type) || "Memo";
        case cl:
          t = l._payload, l = l._init;
          try {
            return ll(l(t));
          } catch {
          }
      }
    return null;
  }
  var il = Array.isArray, U = el.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Y = V.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Rt = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, oe = [], E = -1;
  function G(l) {
    return { current: l };
  }
  function Z(l) {
    0 > E || (l.current = oe[E], oe[E] = null, E--);
  }
  function W(l, t) {
    E++, oe[E] = l.current, l.current = t;
  }
  var at = G(null), se = G(null), Eu = G(null), fn = G(null);
  function cn(l, t) {
    switch (W(Eu, t), W(se, l), W(at, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? im(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = im(t), l = fm(t, l);
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
    Z(at), W(at, l);
  }
  function ba() {
    Z(at), Z(se), Z(Eu);
  }
  function qi(l) {
    var t = l.memoizedState;
    t !== null && (ie._currentValue = t.memoizedState, W(fn, l)), t = at.current;
    var u = fm(t, l.type);
    t !== u && (W(se, l), W(at, u));
  }
  function on(l) {
    se.current === l && (Z(at), Z(se)), fn.current === l && (Z(fn), ie._currentValue = Rt);
  }
  var Yi, Do;
  function zu(l) {
    if (Yi === void 0)
      try {
        throw Error();
      } catch (u) {
        var t = u.stack.trim().match(/\n( *(at )?)/);
        Yi = t && t[1] || "", Do = -1 < u.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < u.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Yi + l + Do;
  }
  var Gi = !1;
  function Xi(l, t) {
    if (!l || Gi) return "";
    Gi = !0;
    var u = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var a = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var T = function() {
                throw Error();
              };
              if (Object.defineProperty(T.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(T, []);
                } catch (O) {
                  var v = O;
                }
                Reflect.construct(l, [], T);
              } else {
                try {
                  T.call();
                } catch (O) {
                  v = O;
                }
                T = !1;
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
                  }), T = !0, new l();
                } finally {
                  T && (h !== void 0 ? Object.defineProperty(l.prototype, "props", h) : delete l.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (O) {
                v = O;
              }
              (T = l()) && typeof T.catch == "function" && T.catch(function() {
              });
            }
          } catch (O) {
            if (O && v && typeof O.stack == "string")
              return [O.stack, v.stack];
          }
          return [null, null];
        }
      };
      a.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var e = Object.getOwnPropertyDescriptor(
        a.DetermineComponentFrameRoot,
        "name"
      );
      e && e.configurable && Object.defineProperty(
        a.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = a.DetermineComponentFrameRoot(), i = n[0], f = n[1];
      if (i && f) {
        var c = i.split(`
`), d = f.split(`
`);
        for (e = a = 0; a < c.length && !c[a].includes("DetermineComponentFrameRoot"); )
          a++;
        for (; e < d.length && !d[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (a === c.length || e === d.length)
          for (a = c.length - 1, e = d.length - 1; 1 <= a && 0 <= e && c[a] !== d[e]; )
            e--;
        for (; 1 <= a && 0 <= e; a--, e--)
          if (c[a] !== d[e]) {
            if (a !== 1 || e !== 1)
              do
                if (a--, e--, 0 > e || c[a] !== d[e]) {
                  var g = `
` + c[a].replace(" at new ", " at ");
                  return l.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", l.displayName)), g;
                }
              while (1 <= a && 0 <= e);
            break;
          }
      }
    } finally {
      Gi = !1, Error.prepareStackTrace = u;
    }
    return (u = l ? l.displayName || l.name : "") ? zu(u) : "";
  }
  function od(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return zu(l.type);
      case 16:
        return zu("Lazy");
      case 13:
        return l.child !== t && t !== null ? zu("Suspense Fallback") : zu("Suspense");
      case 19:
        return zu("SuspenseList");
      case 0:
      case 15:
        return Xi(l.type, !1);
      case 11:
        return Xi(l.type.render, !1);
      case 1:
        return Xi(l.type, !0);
      case 31:
        return zu("Activity");
      case 30:
        return zu("ViewTransition");
      default:
        return "";
    }
  }
  function Mo(l) {
    try {
      var t = "", u = null;
      do
        t += od(l, u), u = l, l = l.return;
      while (l);
      return t;
    } catch (a) {
      return `
Error generating stack: ` + a.message + `
` + a.stack;
    }
  }
  var Qi = Object.prototype.hasOwnProperty, Zi = A.unstable_scheduleCallback, Vi = A.unstable_cancelCallback, sd = A.unstable_shouldYield, vd = A.unstable_requestPaint, St = A.unstable_now, md = A.unstable_getCurrentPriorityLevel, Uo = A.unstable_ImmediatePriority, Co = A.unstable_UserBlockingPriority, sn = A.unstable_NormalPriority, dd = A.unstable_LowPriority, Ro = A.unstable_IdlePriority, rd = A.log, yd = A.unstable_setDisableYieldValue, ve = null, bt = null;
  function _u(l) {
    if (typeof rd == "function" && yd(l), bt && typeof bt.setStrictMode == "function")
      try {
        bt.setStrictMode(ve, l);
      } catch {
      }
  }
  var Tt = Math.clz32 ? Math.clz32 : Sd, hd = Math.log, gd = Math.LN2;
  function Sd(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (hd(l) / gd | 0) | 0;
  }
  var vn = 256, mn = 262144, dn = 4194304;
  function Wu(l) {
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
  function rn(l, t, u) {
    var a = l.pendingLanes;
    if (a === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var f = a & 134217727;
    return f !== 0 ? (a = f & ~n, a !== 0 ? e = Wu(a) : (i &= f, i !== 0 ? e = Wu(i) : u || (u = f & ~l, u !== 0 && (e = Wu(u))))) : (f = a & ~n, f !== 0 ? e = Wu(f) : i !== 0 ? e = Wu(i) : u || (u = a & ~l, u !== 0 && (e = Wu(u)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, u = t & -t, n >= u || n === 32 && (u & 4194048) !== 0) ? t : e;
  }
  function me(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function Ho(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var u = l.entangledLanes;
    if (u !== 0)
      for (l = l.entanglements, u &= t; 0 < u; ) {
        var a = 31 - Tt(u), e = 1 << a;
        t |= l[a], u &= ~e;
      }
    return t;
  }
  function bd(l, t) {
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
  function po() {
    var l = dn;
    return dn <<= 1, (dn & 62914560) === 0 && (dn = 4194304), l;
  }
  function Li(l) {
    for (var t = [], u = 0; 31 > u; u++) t.push(l);
    return t;
  }
  function de(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function Td(l, t, u, a, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = u, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= u, l.entangledLanes &= u, l.errorRecoveryDisabledLanes &= u, l.shellSuspendCounter = 0;
    var f = l.entanglements, c = l.expirationTimes, d = l.hiddenUpdates;
    for (u = i & ~u; 0 < u; ) {
      var g = 31 - Tt(u), T = 1 << g;
      f[g] = 0, c[g] = -1;
      var v = d[g];
      if (v !== null)
        for (d[g] = null, g = 0; g < v.length; g++) {
          var h = v[g];
          h !== null && (h.lane &= -536870913);
        }
      u &= ~T;
    }
    a !== 0 && jo(l, a, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function jo(l, t, u) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var a = 31 - Tt(t);
    l.entangledLanes |= t, l.entanglements[a] = l.entanglements[a] | 1073741824 | u & 261930;
  }
  function xo(l, t) {
    var u = l.entangledLanes |= t;
    for (l = l.entanglements; u; ) {
      var a = 31 - Tt(u), e = 1 << a;
      e & t | l[a] & t && (l[a] |= t), u &= ~e;
    }
  }
  function Bo(l, t) {
    var u = t & -t;
    return u = (u & 42) !== 0 ? 1 : Ki(u), (u & (l.suspendedLanes | t)) !== 0 ? 0 : u;
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
    var l = Y.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : Lm(l.type));
  }
  function Yo(l, t) {
    var u = Y.p;
    try {
      return Y.p = l, t();
    } finally {
      Y.p = u;
    }
  }
  var iu = Math.random().toString(36).slice(2), Fl = "__reactFiber$" + iu, vt = "__reactProps$" + iu, Ta = "__reactContainer$" + iu, Go = "__reactEvents$" + iu, Ed = "__reactListeners$" + iu, zd = "__reactHandles$" + iu, Xo = "__reactResources$" + iu, re = "__reactMarker$" + iu, yn = "__reactLoad$" + iu;
  function hn(l) {
    delete l[Fl], delete l[vt], delete l[Ed], delete l[zd];
  }
  function Iu(l) {
    var t;
    if (t = l[Fl]) return t;
    for (var u = l.parentNode; u; ) {
      if (t = u[Ta] || u[Fl]) {
        if (u = t.alternate, t.child !== null || u !== null && u.child !== null)
          for (l = Om(l); l !== null; ) {
            if (u = l[Fl]) return u;
            l = Om(l);
          }
        return t;
      }
      l = u, u = l.parentNode;
    }
    return null;
  }
  function Ea(l) {
    if (l = l[Fl] || l[Ta]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function ye(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(y(33));
  }
  function za(l) {
    var t = l[Xo];
    return t || (t = l[Xo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Ll(l) {
    l[re] = !0;
  }
  function Qo(l) {
    l[yn] = void 0;
  }
  var Zo = /* @__PURE__ */ new Set(), Vo = {};
  function ku(l, t) {
    _a(l, t), _a(l + "Capture", t);
  }
  function _a(l, t) {
    for (Vo[l] = t, l = 0; l < t.length; l++)
      Zo.add(t[l]);
  }
  var _d = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Lo = {}, Ko = {};
  function Od(l) {
    return Qi.call(Ko, l) ? !0 : Qi.call(Lo, l) ? !1 : _d.test(l) ? Ko[l] = !0 : (Lo[l] = !0, !1);
  }
  var ol = !1;
  function Jo() {
    var l = ol;
    return ol = !1, l;
  }
  function gn(l, t, u) {
    if (Od(t))
      if (u === null) l.removeAttribute(t);
      else {
        switch (typeof u) {
          case "undefined":
          case "function":
          case "symbol":
            l.removeAttribute(t);
            return;
          case "boolean":
            var a = t.toLowerCase().slice(0, 5);
            if (a !== "data-" && a !== "aria-") {
              l.removeAttribute(t);
              return;
            }
        }
        l.setAttribute(t, u);
      }
  }
  function Sn(l, t, u) {
    if (u === null) l.removeAttribute(t);
    else {
      switch (typeof u) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(t);
          return;
      }
      l.setAttribute(t, u);
    }
  }
  function fu(l, t, u, a) {
    if (a === null) l.removeAttribute(u);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(u);
          return;
      }
      l.setAttributeNS(t, u, a);
    }
  }
  function Et(l) {
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
  function Nd(l, t, u) {
    var a = Object.getOwnPropertyDescriptor(
      l.constructor.prototype,
      t
    );
    if (!l.hasOwnProperty(t) && typeof a < "u" && typeof a.get == "function" && typeof a.set == "function") {
      var e = a.get, n = a.set;
      return Object.defineProperty(l, t, {
        configurable: !0,
        get: function() {
          return e.call(this);
        },
        set: function(i) {
          u = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(l, t, {
        enumerable: a.enumerable
      }), {
        getValue: function() {
          return u;
        },
        setValue: function(i) {
          u = "" + i;
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
      l._valueTracker = Nd(
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
    var u = t.getValue(), a = "";
    return l && (a = wo(l) ? l.checked ? "true" : "false" : l.value), l = a, l !== u ? (t.setValue(l), !0) : !1;
  }
  var Ad = /[\n"\\]/g;
  function Ht(l) {
    return l.replace(
      Ad,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function $i(l, t, u, a, e, n, i, f) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Et(t)) : l.value !== "" + Et(t) && (l.value = "" + Et(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Fi(l, Et(l.value)) : Fi(l, Et(t)) : u != null ? Fi(l, Et(u)) : a != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" ? l.name = "" + Et(f) : l.removeAttribute("name");
  }
  function Fo(l, t, u, a, e, n, i, f) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || u != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        wi(l);
        return;
      }
      u = u != null ? "" + Et(u) : "", t = t != null ? "" + Et(t) : u, f || t === l.value || (l.value = t), l.defaultValue = t;
    }
    a = a ?? e, a = typeof a != "function" && typeof a != "symbol" && !!a, l.checked = f ? l.checked : !!a, l.defaultChecked = !!a, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), wi(l);
  }
  function Fi(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function Oa(l, t, u, a) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < u.length; e++)
        t["$" + u[e]] = !0;
      for (u = 0; u < l.length; u++)
        e = t.hasOwnProperty("$" + l[u].value), l[u].selected !== e && (l[u].selected = e), e && a && (l[u].defaultSelected = !0);
    } else {
      for (u = "" + Et(u), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === u) {
          l[e].selected = !0, a && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Wo(l, t, u) {
    if (t != null && (t = "" + Et(t), t !== l.value && (l.value = t), u == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = u != null ? "" + Et(u) : "";
  }
  function Io(l, t, u, a) {
    if (t == null) {
      if (a != null) {
        if (u != null) throw Error(y(92));
        if (il(a)) {
          if (1 < a.length) throw Error(y(93));
          a = a[0];
        }
        u = a;
      }
      u == null && (u = ""), t = u;
    }
    u = Et(t), l.defaultValue = u, a = l.textContent, a === u && a !== "" && a !== null && (l.value = a), wi(l);
  }
  function Na(l, t) {
    if (t) {
      var u = l.firstChild;
      if (u && u === l.lastChild && u.nodeType === 3) {
        u.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var Dd = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ko(l, t, u) {
    var a = t.indexOf("--") === 0;
    u == null || typeof u == "boolean" || u === "" ? a ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : a ? l.setProperty(t, u) : typeof u != "number" || u === 0 || Dd.has(t) ? t === "float" ? l.cssFloat = u : l[t] = ("" + u).trim() : l[t] = u + "px";
  }
  function Po(l, t, u) {
    if (t != null && typeof t != "object")
      throw Error(y(62));
    if (l = l.style, u != null) {
      for (var a in u)
        !u.hasOwnProperty(a) || t != null && t.hasOwnProperty(a) || (a.indexOf("--") === 0 ? l.setProperty(a, "") : a === "float" ? l.cssFloat = "" : l[a] = "", ol = !0);
      for (var e in t)
        a = t[e], t.hasOwnProperty(e) && u[e] !== a && (ko(l, e, a), ol = !0);
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
  var Md = /* @__PURE__ */ new Map([
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
  ]), Ud = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function bn(l) {
    return Ud.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Ft() {
  }
  var Ii = null;
  function ki(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Aa = null, Da = null;
  function ls(l) {
    var t = Ea(l);
    if (t && (l = t.stateNode)) {
      var u = l[vt] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if ($i(
            l,
            u.value,
            u.defaultValue,
            u.defaultValue,
            u.checked,
            u.defaultChecked,
            u.type,
            u.name
          ), t = u.name, u.type === "radio" && t != null) {
            for (u = l; u.parentNode; ) u = u.parentNode;
            for (u = u.querySelectorAll(
              'input[name="' + Ht(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < u.length; t++) {
              var a = u[t];
              if (a !== l && a.form === l.form) {
                var e = a[vt] || null;
                if (!e) throw Error(y(90));
                $i(
                  a,
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
            for (t = 0; t < u.length; t++)
              a = u[t], a.form === l.form && $o(a);
          }
          break l;
        case "textarea":
          Wo(l, u.value, u.defaultValue);
          break l;
        case "select":
          t = u.value, t != null && Oa(l, !!u.multiple, t, !1);
      }
    }
  }
  var Pi = !1;
  function ts(l, t, u) {
    if (Pi) return l(t, u);
    Pi = !0;
    try {
      var a = l(t);
      return a;
    } finally {
      if (Pi = !1, (Aa !== null || Da !== null) && (bi(), Aa && (t = Aa, l = Da, Da = Aa = null, ls(t), l)))
        for (t = 0; t < l.length; t++) ls(l[t]);
    }
  }
  function he(l, t) {
    var u = l.stateNode;
    if (u === null) return null;
    var a = u[vt] || null;
    if (a === null) return null;
    u = a[t];
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
        (a = !a.disabled) || (l = l.type, a = !(l === "button" || l === "input" || l === "select" || l === "textarea")), l = !a;
        break l;
      default:
        l = !1;
    }
    if (l) return null;
    if (u && typeof u != "function")
      throw Error(
        y(231, t, typeof u)
      );
    return u;
  }
  var cu = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), lf = !1;
  if (cu)
    try {
      var ge = {};
      Object.defineProperty(ge, "passive", {
        get: function() {
          lf = !0;
        }
      }), window.addEventListener("test", ge, ge), window.removeEventListener("test", ge, ge);
    } catch {
      lf = !1;
    }
  var Ou = null, tf = null, Tn = null;
  function us() {
    if (Tn) return Tn;
    var l, t = tf, u = t.length, a, e = "value" in Ou ? Ou.value : Ou.textContent, n = e.length;
    for (l = 0; l < u && t[l] === e[l]; l++) ;
    var i = u - l;
    for (a = 1; a <= i && t[u - a] === e[n - a]; a++) ;
    return Tn = e.slice(l, 1 < a ? 1 - a : void 0);
  }
  function En(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function zn() {
    return !0;
  }
  function as() {
    return !1;
  }
  function it(l) {
    function t(u, a, e, n, i) {
      this._reactName = u, this._targetInst = e, this.type = a, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var f in l)
        l.hasOwnProperty(f) && (u = l[f], this[f] = u ? u(n) : n[f]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? zn : as, this.isPropagationStopped = as, this;
    }
    return Q(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var u = this.nativeEvent;
        u && (u.preventDefault ? u.preventDefault() : typeof u.returnValue != "unknown" && (u.returnValue = !1), this.isDefaultPrevented = zn);
      },
      stopPropagation: function() {
        var u = this.nativeEvent;
        u && (u.stopPropagation ? u.stopPropagation() : typeof u.cancelBubble != "unknown" && (u.cancelBubble = !0), this.isPropagationStopped = zn);
      },
      persist: function() {
      },
      isPersistent: zn
    }), t;
  }
  var Nu = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, _n = it(Nu), Se = Q({}, Nu, { view: 0, detail: 0 }), Cd = it(Se), uf, af, be, On = Q({}, Se, {
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
    getModifierState: nf,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== be && (be && l.type === "mousemove" ? (uf = l.screenX - be.screenX, af = l.screenY - be.screenY) : af = uf = 0, be = l), uf);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : af;
    }
  }), es = it(On), Rd = Q({}, On, { dataTransfer: 0 }), Hd = it(Rd), pd = Q({}, Se, { relatedTarget: 0 }), ef = it(pd), jd = Q({}, Nu, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), xd = it(jd), Bd = Q({}, Nu, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), qd = it(Bd), Yd = Q({}, Nu, { data: 0 }), ns = it(Yd), Gd = {
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
  }, Xd = {
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
  }, Qd = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Zd(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Qd[l]) ? !!t[l] : !1;
  }
  function nf() {
    return Zd;
  }
  var Vd = Q({}, Se, {
    key: function(l) {
      if (l.key) {
        var t = Gd[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = En(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Xd[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: nf,
    charCode: function(l) {
      return l.type === "keypress" ? En(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? En(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), Ld = it(Vd), Kd = Q({}, On, {
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
  }), is = it(Kd), Jd = Q({}, Nu, { submitter: 0 }), wd = it(Jd), $d = Q({}, Se, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: nf
  }), Fd = it($d), Wd = Q({}, Nu, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Id = it(Wd), kd = Q({}, On, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Pd = it(kd), lr = Q({}, Nu, {
    newState: 0,
    oldState: 0,
    source: 0
  }), tr = it(lr), ur = [9, 13, 27, 32], ff = cu && "CompositionEvent" in window, Te = null;
  cu && "documentMode" in document && (Te = document.documentMode);
  var ar = cu && "TextEvent" in window && !Te, fs = cu && (!ff || Te && 8 < Te && 11 >= Te), cs = " ", os = !1;
  function ss(l, t) {
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
  function vs(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Ma = !1;
  function er(l, t) {
    switch (l) {
      case "compositionend":
        return vs(t);
      case "keypress":
        return t.which !== 32 ? null : (os = !0, cs);
      case "textInput":
        return l = t.data, l === cs && os ? null : l;
      default:
        return null;
    }
  }
  function nr(l, t) {
    if (Ma)
      return l === "compositionend" || !ff && ss(l, t) ? (l = us(), Tn = tf = Ou = null, Ma = !1, l) : null;
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
  function ds(l, t, u, a) {
    Aa ? Da ? Da.push(a) : Da = [a] : Aa = a, t = Ni(t, "onChange"), 0 < t.length && (u = new _n(
      "onChange",
      "change",
      null,
      u,
      a
    ), l.push({ event: u, listeners: t }));
  }
  var Ee = null, ze = null;
  function fr(l) {
    lm(l, 0);
  }
  function Nn(l) {
    var t = ye(l);
    if ($o(t)) return l;
  }
  function rs(l, t) {
    if (l === "change") return t;
  }
  var ys = !1;
  if (cu) {
    var cf;
    if (cu) {
      var of = "oninput" in document;
      if (!of) {
        var hs = document.createElement("div");
        hs.setAttribute("oninput", "return;"), of = typeof hs.oninput == "function";
      }
      cf = of;
    } else cf = !1;
    ys = cf && (!document.documentMode || 9 < document.documentMode);
  }
  function gs() {
    Ee && (Ee.detachEvent("onpropertychange", Ss), ze = Ee = null);
  }
  function Ss(l) {
    if (l.propertyName === "value" && Nn(ze)) {
      var t = [];
      ds(
        t,
        ze,
        l,
        ki(l)
      ), ts(fr, t);
    }
  }
  function cr(l, t, u) {
    l === "focusin" ? (gs(), Ee = t, ze = u, Ee.attachEvent("onpropertychange", Ss)) : l === "focusout" && gs();
  }
  function or(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Nn(ze);
  }
  function sr(l, t) {
    if (l === "click") return Nn(t);
  }
  function vr(l, t) {
    if (l === "input" || l === "change")
      return Nn(t);
  }
  function mr(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var zt = typeof Object.is == "function" ? Object.is : mr;
  function _e(l, t) {
    if (zt(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var u = Object.keys(l), a = Object.keys(t);
    if (u.length !== a.length) return !1;
    for (a = 0; a < u.length; a++) {
      var e = u[a];
      if (!Qi.call(t, e) || !zt(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function sf(l) {
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
    var u = bs(l);
    l = 0;
    for (var a; u; ) {
      if (u.nodeType === 3) {
        if (a = l + u.textContent.length, l <= t && a >= t)
          return { node: u, offset: t - l };
        l = a;
      }
      l: {
        for (; u; ) {
          if (u.nextSibling) {
            u = u.nextSibling;
            break l;
          }
          u = u.parentNode;
        }
        u = void 0;
      }
      u = bs(u);
    }
  }
  function Es(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Es(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function zs(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = sf(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var u = typeof t.contentWindow.location.href == "string";
      } catch {
        u = !1;
      }
      if (u) l = t.contentWindow;
      else break;
      t = sf(l.document);
    }
    return t;
  }
  function vf(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var dr = cu && "documentMode" in document && 11 >= document.documentMode, Ua = null, mf = null, Oe = null, df = !1;
  function _s(l, t, u) {
    var a = u.window === u ? u.document : u.nodeType === 9 ? u : u.ownerDocument;
    df || Ua == null || Ua !== sf(a) || (a = Ua, "selectionStart" in a && vf(a) ? a = { start: a.selectionStart, end: a.selectionEnd } : (a = (a.ownerDocument && a.ownerDocument.defaultView || window).getSelection(), a = {
      anchorNode: a.anchorNode,
      anchorOffset: a.anchorOffset,
      focusNode: a.focusNode,
      focusOffset: a.focusOffset
    }), Oe && _e(Oe, a) || (Oe = a, a = Ni(mf, "onSelect"), 0 < a.length && (t = new _n(
      "onSelect",
      "select",
      null,
      t,
      u
    ), l.push({ event: t, listeners: a }), t.target = Ua)));
  }
  function Pu(l, t) {
    var u = {};
    return u[l.toLowerCase()] = t.toLowerCase(), u["Webkit" + l] = "webkit" + t, u["Moz" + l] = "moz" + t, u;
  }
  var Ca = {
    animationend: Pu("Animation", "AnimationEnd"),
    animationiteration: Pu("Animation", "AnimationIteration"),
    animationstart: Pu("Animation", "AnimationStart"),
    transitionrun: Pu("Transition", "TransitionRun"),
    transitionstart: Pu("Transition", "TransitionStart"),
    transitioncancel: Pu("Transition", "TransitionCancel"),
    transitionend: Pu("Transition", "TransitionEnd")
  }, rf = {}, Os = {};
  cu && (Os = document.createElement("div").style, "AnimationEvent" in window || (delete Ca.animationend.animation, delete Ca.animationiteration.animation, delete Ca.animationstart.animation), "TransitionEvent" in window || delete Ca.transitionend.transition);
  function la(l) {
    if (rf[l]) return rf[l];
    if (!Ca[l]) return l;
    var t = Ca[l], u;
    for (u in t)
      if (t.hasOwnProperty(u) && u in Os)
        return rf[l] = t[u];
    return l;
  }
  var Ns = la("animationend"), As = la("animationiteration"), Ds = la("animationstart"), rr = la("transitionrun"), yr = la("transitionstart"), hr = la("transitioncancel"), Ms = la("transitionend"), Us = /* @__PURE__ */ new Map(), yf = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  yf.push("scrollEnd");
  function Qt(l, t) {
    Us.set(l, t), ku(t, [l]);
  }
  var gr = 0;
  function ou(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = Kt.identifierPrefix;
    var u = gr++;
    return l = "_" + l + "t_" + u.toString(32) + "_", t.autoName = l;
  }
  function Cs(l) {
    if (l == null || typeof l == "string")
      return l;
    var t = null, u = Wa;
    if (u !== null)
      for (var a = 0; a < u.length; a++) {
        var e = l[u[a]];
        if (e != null) {
          if (e === "none") return "none";
          t = t == null ? e : t + (" " + e);
        }
      }
    return t ?? l.default;
  }
  function su(l, t) {
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
  }, pt = [], Ra = 0, hf = 0;
  function Dn() {
    for (var l = Ra, t = hf = Ra = 0; t < l; ) {
      var u = pt[t];
      pt[t++] = null;
      var a = pt[t];
      pt[t++] = null;
      var e = pt[t];
      pt[t++] = null;
      var n = pt[t];
      if (pt[t++] = null, a !== null && e !== null) {
        var i = a.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), a.pending = e;
      }
      n !== 0 && Rs(u, e, n);
    }
  }
  function Mn(l, t, u, a) {
    pt[Ra++] = l, pt[Ra++] = t, pt[Ra++] = u, pt[Ra++] = a, hf |= a, l.lanes |= a, l = l.alternate, l !== null && (l.lanes |= a);
  }
  function gf(l, t, u, a) {
    return Mn(l, t, u, a), Un(l);
  }
  function ta(l, t) {
    return Mn(l, null, null, t), Un(l);
  }
  function Rs(l, t, u) {
    l.lanes |= u;
    var a = l.alternate;
    a !== null && (a.lanes |= u);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= u, a = n.alternate, a !== null && (a.childLanes |= u), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - Tt(u), l = n.hiddenUpdates, a = l[e], a === null ? l[e] = [t] : a.push(t), t.lane = u | 536870912), n) : null;
  }
  function Un(l) {
    if (50 < Je)
      throw Je = 0, Si = null, Error(y(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Ha = {};
  function Sr(l, t, u, a) {
    this.tag = l, this.key = u, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = a, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function mt(l, t, u, a) {
    return new Sr(l, t, u, a);
  }
  function Sf(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function vu(l, t) {
    var u = l.alternate;
    return u === null ? (u = mt(
      l.tag,
      t,
      l.key,
      l.mode
    ), u.elementType = l.elementType, u.type = l.type, u.stateNode = l.stateNode, u.alternate = l, l.alternate = u) : (u.pendingProps = t, u.type = l.type, u.flags = 0, u.subtreeFlags = 0, u.deletions = null), u.flags = l.flags & 1206910976, u.childLanes = l.childLanes, u.lanes = l.lanes, u.child = l.child, u.memoizedProps = l.memoizedProps, u.memoizedState = l.memoizedState, u.updateQueue = l.updateQueue, t = l.dependencies, u.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, u.sibling = l.sibling, u.index = l.index, u.ref = l.ref, u.refCleanup = l.refCleanup, u;
  }
  function Hs(l, t) {
    l.flags &= 1206910978;
    var u = l.alternate;
    return u === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = u.childLanes, l.lanes = u.lanes, l.child = u.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = u.memoizedProps, l.memoizedState = u.memoizedState, l.updateQueue = u.updateQueue, l.type = u.type, t = u.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Cn(l, t, u, a, e, n) {
    var i = 0;
    if (a = l, typeof a == "function") Sf(a) && (i = 1);
    else if (typeof a == "string")
      i = Jy(
        l,
        u,
        at.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (a) {
        case nt:
          return l = mt(31, u, t, e), l.elementType = nt, l.lanes = n, l;
        case xl:
          return ua(u.children, e, n, t);
        case ut:
          i = 8, e |= 24;
          break;
        case wt:
          return l = mt(12, u, t, e | 2), l.elementType = wt, l.lanes = n, l;
        case j:
          return l = mt(13, u, t, e), l.elementType = j, l.lanes = n, l;
        case B:
          return l = mt(19, u, t, e), l.elementType = B, l.lanes = n, l;
        case Ct:
        case s:
          return l = e | 32, l = mt(30, u, t, l), l.elementType = s, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof a == "object" && a !== null)
            switch (a.$$typeof) {
              case Dl:
                i = 10;
                break l;
              case Ut:
                i = 9;
                break l;
              case N:
                i = 11;
                break l;
              case ul:
                i = 14;
                break l;
              case cl:
                i = 16, a = null;
                break l;
            }
          i = 29, u = Error(
            y(130, l === null ? "null" : typeof l, "")
          ), a = null;
      }
    return t = mt(i, u, t, e), t.elementType = l, t.type = a, t.lanes = n, t;
  }
  function ua(l, t, u, a) {
    return l = mt(7, l, a, t), l.lanes = u, l;
  }
  function bf(l, t, u) {
    return l = mt(6, l, null, t), l.lanes = u, l;
  }
  function ps(l) {
    var t = mt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function Tf(l, t, u) {
    return t = mt(
      4,
      l.children !== null ? l.children : [],
      l.key,
      t
    ), t.lanes = u, t.stateNode = {
      containerInfo: l.containerInfo,
      pendingChildren: null,
      implementation: l.implementation
    }, t;
  }
  var js = /* @__PURE__ */ new WeakMap();
  function jt(l, t) {
    if (typeof l == "object" && l !== null) {
      var u = js.get(l);
      return u !== void 0 ? u : (t = {
        value: l,
        source: t,
        stack: Mo(t)
      }, js.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Mo(t)
    };
  }
  var pa = [], ja = 0, Rn = null, Ne = 0, xt = [], Bt = 0, Au = null, Wt = 1, It = "";
  function mu(l, t) {
    pa[ja++] = Ne, pa[ja++] = Rn, Rn = l, Ne = t;
  }
  function xs(l, t, u) {
    xt[Bt++] = Wt, xt[Bt++] = It, xt[Bt++] = Au, Au = l;
    var a = Wt;
    l = It;
    var e = 32 - Tt(a) - 1;
    a &= ~(1 << e), u += 1;
    var n = 32 - Tt(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (a & (1 << i) - 1).toString(32), a >>= i, e -= i, Wt = 1 << 32 - Tt(t) + e | u << e | a, It = n + l;
    } else
      Wt = 1 << n | u << e | a, It = l;
  }
  function Hn(l) {
    l.return !== null && (mu(l, 1), xs(l, 1, 0));
  }
  function Ef(l) {
    for (; l === Rn; )
      Rn = pa[--ja], pa[ja] = null, Ne = pa[--ja], pa[ja] = null;
    for (; l === Au; )
      Au = xt[--Bt], xt[Bt] = null, It = xt[--Bt], xt[Bt] = null, Wt = xt[--Bt], xt[Bt] = null;
  }
  function Bs(l, t) {
    xt[Bt++] = Wt, xt[Bt++] = It, xt[Bt++] = Au, Wt = t.id, It = t.overflow, Au = l;
  }
  var Kl = null, Tl = null, J = !1, Du = null, qt = !1, zf = Error(y(519));
  function Mu(l) {
    var t = Error(
      y(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Ae(jt(t, l)), zf;
  }
  function qs(l) {
    var t = l.stateNode, u = l.type, a = l.memoizedProps;
    switch (t[Fl] = l, t[vt] = a, u) {
      case "dialog":
        $("cancel", t), $("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        $("load", t);
        break;
      case "video":
      case "audio":
        for (u = 0; u < $e.length; u++)
          $($e[u], t);
        break;
      case "source":
        $("error", t);
        break;
      case "img":
      case "image":
      case "link":
        $("error", t), $("load", t);
        break;
      case "details":
        $("toggle", t);
        break;
      case "input":
        $("invalid", t), Fo(
          t,
          a.value,
          a.defaultValue,
          a.checked,
          a.defaultChecked,
          a.type,
          a.name,
          !0
        );
        break;
      case "select":
        $("invalid", t);
        break;
      case "textarea":
        $("invalid", t), Io(t, a.value, a.defaultValue, a.children);
    }
    u = a.children, typeof u != "string" && typeof u != "number" && typeof u != "bigint" || t.textContent === "" + u || a.suppressHydrationWarning === !0 || em(t.textContent, u) ? (a.popover != null && ($("beforetoggle", t), $("toggle", t)), a.onScroll != null && $("scroll", t), a.onScrollEnd != null && $("scrollend", t), a.onClick != null && (t.onclick = Ft), t = !0) : t = !1, t || Mu(l, !0);
  }
  function pn(l) {
    for (Kl = l.return; Kl; )
      switch (Kl.tag) {
        case 5:
        case 31:
        case 13:
          qt = !1;
          return;
        case 27:
        case 3:
          qt = !0;
          return;
        default:
          Kl = Kl.return;
      }
  }
  function xa(l) {
    if (l !== Kl) return !1;
    if (!J) return pn(l), J = !0, !1;
    var t = l.tag, u;
    if ((u = t !== 3 && t !== 27) && ((u = t === 5) && (u = l.type, u = !(u !== "form" && u !== "button") || kc(l.type, l.memoizedProps)), u = !u), u && Tl && Mu(l), pn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(317));
      Tl = _m(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(317));
      Tl = _m(l);
    } else
      t === 27 ? (t = Tl, Lu(l.type) ? (l = fo, fo = null, Tl = l) : Tl = t) : Tl = Kl ? Gt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function aa() {
    Tl = Kl = null, J = !1;
  }
  function _f() {
    var l = Du;
    return l !== null && (yt === null ? yt = l : yt.push.apply(
      yt,
      l
    ), Du = null), l;
  }
  function Ae(l) {
    Du === null ? Du = [l] : Du.push(l);
  }
  var Of = G(null), ea = null, du = null;
  function Uu(l, t, u) {
    W(Of, t._currentValue), t._currentValue = u;
  }
  function ru(l) {
    l._currentValue = Of.current, Z(Of);
  }
  function jn(l, t, u) {
    for (; l !== null; ) {
      var a = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, a !== null && (a.childLanes |= t)) : a !== null && (a.childLanes & t) !== t && (a.childLanes |= t), l === u) break;
      l = l.return;
    }
  }
  function Nf(l, t, u, a) {
    var e = l.child;
    for (e !== null && (e.return = l); e !== null; ) {
      var n = e.dependencies;
      if (n !== null) {
        var i = e.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var f = n;
          n = e;
          for (var c = 0; c < t.length; c++)
            if (f.context === t[c]) {
              n.lanes |= u, f = n.alternate, f !== null && (f.lanes |= u), jn(
                n.return,
                u,
                l
              ), a || (i = null);
              break l;
            }
          n = f.next;
        }
      } else if (e.tag === 18) {
        if (i = e.return, i === null) throw Error(y(341));
        i.lanes |= u, n = i.alternate, n !== null && (n.lanes |= u), jn(i, u, l), i = null;
      } else
        e.tag === 13 && e.memoizedState !== null && e.memoizedState.dehydrated === null ? (e.lanes |= u, i = e.alternate, i !== null && (i.lanes |= u), jn(
          e.return,
          u,
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
  function na(l, t, u, a) {
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
          var f = e.type;
          zt(e.pendingProps.value, i.value) || (l !== null ? l.push(f) : l = [f]);
        }
      } else if (e === fn.current) {
        if (i = e.alternate, i === null) throw Error(y(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(ie) : l = [ie]);
      }
      e = e.return;
    }
    return l !== null && Nf(
      t,
      l,
      u,
      a
    ), t.flags |= 262144, l !== null;
  }
  function xn(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!zt(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function ia(l) {
    ea = l, du = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Wl(l) {
    return Ys(ea, l);
  }
  function Bn(l, t) {
    return ea === null && ia(l), Ys(l, t);
  }
  function Ys(l, t) {
    var u = t._currentValue;
    if (t = { context: t, memoizedValue: u, next: null }, du === null) {
      if (l === null) throw Error(y(308));
      du = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else du = du.next = t;
    return u;
  }
  var br = typeof AbortController < "u" ? AbortController : function() {
    var l = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(u, a) {
        l.push(a);
      }
    };
    this.abort = function() {
      t.aborted = !0, l.forEach(function(u) {
        return u();
      });
    };
  }, Tr = A.unstable_scheduleCallback, Er = A.unstable_NormalPriority, Bl = {
    $$typeof: Dl,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Af() {
    return {
      controller: new br(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function De(l) {
    l.refCount--, l.refCount === 0 && Tr(Er, function() {
      l.controller.abort();
    });
  }
  function Gs(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var u = l.transitionTypes;
      for (u === null && (u = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var a = t[l];
        u.indexOf(a) === -1 && u.push(a);
      }
    }
  }
  var Me = null;
  function zr(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Ue = null, Df = 0, fa = 0, Ba = null;
  function _r(l, t) {
    if (Ue === null) {
      var u = Ue = [];
      Df = 0, fa = Vc(), Ba = {
        status: "pending",
        value: void 0,
        then: function(a) {
          u.push(a);
        }
      };
    }
    return Df++, t.then(Xs, Xs), t;
  }
  function Xs() {
    if (--Df === 0 && (Me = null, Ue !== null)) {
      Ba !== null && (Ba.status = "fulfilled");
      var l = Ue;
      Ue = null, fa = 0, Ba = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Or(l, t) {
    var u = [], a = {
      status: "pending",
      value: null,
      reason: null,
      then: function(e) {
        u.push(e);
      }
    };
    return l.then(
      function() {
        a.status = "fulfilled", a.value = t;
        for (var e = 0; e < u.length; e++) (0, u[e])(t);
      },
      function(e) {
        for (a.status = "rejected", a.reason = e, e = 0; e < u.length; e++)
          (0, u[e])(void 0);
      }
    ), a;
  }
  var Qs = U.S;
  U.S = function(l, t) {
    if (pv = St(), typeof t == "object" && t !== null && typeof t.then == "function" && _r(l, t), Me !== null)
      for (var u = le; u !== null; )
        Gs(u, Me), u = u.next;
    if (u = l.types, u !== null) {
      for (var a = le; a !== null; )
        Gs(a, u), a = a.next;
      if (fa !== 0) {
        a = Me, a === null && (a = Me = []);
        for (var e = 0; e < u.length; e++) {
          var n = u[e];
          a.indexOf(n) === -1 && a.push(n);
        }
      }
    }
    Qs !== null && Qs(l, t);
  };
  var ca = G(null);
  function Mf() {
    var l = ca.current;
    return l !== null ? l : bl.pooledCache;
  }
  function qn(l, t) {
    t === null ? W(ca, ca.current) : W(ca, t.pool);
  }
  function Zs() {
    var l = Mf();
    return l === null ? null : { parent: Bl._currentValue, pool: l };
  }
  var qa = Error(y(460)), Uf = Error(y(474)), Yn = Error(y(542)), Gn = { then: function() {
  } };
  function Vs(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Ls(l, t, u) {
    switch (u = l[u], u === void 0 ? l.push(t) : u !== t && (t.then(Ft, Ft), t = u), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Js(l), l === void 0 && !("reason" in t) ? Error(y(600)) : l;
      default:
        if (typeof t.status == "string") t.then(Ft, Ft);
        else {
          if (l = bl, l !== null && 100 < l.shellSuspendCounter)
            throw Error(y(482));
          l = t, l.status = "pending", l.then(
            function(a) {
              if (t.status === "pending") {
                var e = t;
                e.status = "fulfilled", e.value = a;
              }
            },
            function(a) {
              if (t.status === "pending") {
                var e = t;
                e.status = "rejected", e.reason = a;
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
        throw sa = t, qa;
    }
  }
  function oa(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (u) {
      throw u !== null && typeof u == "object" && typeof u.then == "function" ? (sa = u, qa) : u;
    }
  }
  var sa = null;
  function Ks() {
    if (sa === null) throw Error(y(459));
    var l = sa;
    return sa = null, l;
  }
  function Js(l) {
    if (l === qa || l === Yn)
      throw Error(y(483));
  }
  var Ya = null, Ce = 0;
  function Xn(l) {
    var t = Ce;
    return Ce += 1, Ya === null && (Ya = []), Ls(Ya, l, t);
  }
  function Cu(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Qn(l, t) {
    throw t.$$typeof === P ? Error(y(525)) : (l = Object.prototype.toString.call(t), Error(
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
    function u(m, o) {
      if (!l) return null;
      for (; o !== null; )
        t(m, o), o = o.sibling;
      return null;
    }
    function a(m) {
      for (var o = /* @__PURE__ */ new Map(); m !== null; )
        m.key === null ? o.set(m.index, m) : o.set(m.key, m), m = m.sibling;
      return o;
    }
    function e(m, o) {
      return m = vu(m, o), m.index = 0, m.sibling = null, m;
    }
    function n(m, o, r) {
      return m.index = r, l ? (r = m.alternate, r !== null ? (r = r.index, r < o ? (m.flags |= 2, o) : r) : (m.flags |= 134217730, o)) : (m.flags |= 1048576, o);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 134217730), m;
    }
    function f(m, o, r, b) {
      return o === null || o.tag !== 6 ? (o = bf(r, m.mode, b), o.return = m, o) : (o = e(o, r), o.return = m, o);
    }
    function c(m, o, r, b) {
      var M = r.type;
      return M === xl ? (m = g(
        m,
        o,
        r.props.children,
        b,
        r.key
      ), Cu(m, r), m) : o !== null && (o.elementType === M || typeof M == "object" && M !== null && M.$$typeof === cl && oa(M) === o.type) ? (o = e(o, r.props), Cu(o, r), o.return = m, o) : (o = Cn(
        r.type,
        r.key,
        r.props,
        null,
        m.mode,
        b
      ), Cu(o, r), o.return = m, o);
    }
    function d(m, o, r, b) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== r.containerInfo || o.stateNode.implementation !== r.implementation ? (o = Tf(r, m.mode, b), o.return = m, o) : (o = e(o, r.children || []), o.return = m, o);
    }
    function g(m, o, r, b, M) {
      return o === null || o.tag !== 7 ? (o = ua(
        r,
        m.mode,
        b,
        M
      ), o.return = m, o) : (o = e(o, r), o.return = m, o);
    }
    function T(m, o, r) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = bf(
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
            ), Cu(r, o), r.return = m, r;
          case Vl:
            return o = Tf(
              o,
              m.mode,
              r
            ), o.return = m, o;
          case cl:
            return o = oa(o), T(m, o, r);
        }
        if (il(o) || H(o))
          return o = ua(
            o,
            m.mode,
            r,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return T(m, Xn(o), r);
        if (o.$$typeof === Dl)
          return T(
            m,
            Bn(m, o),
            r
          );
        Qn(m, o);
      }
      return null;
    }
    function v(m, o, r, b) {
      var M = o !== null ? o.key : null;
      if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint")
        return M !== null ? null : f(m, o, "" + r, b);
      if (typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case st:
            return r.key === M ? c(m, o, r, b) : null;
          case Vl:
            return r.key === M ? d(m, o, r, b) : null;
          case cl:
            return r = oa(r), v(m, o, r, b);
        }
        if (il(r) || H(r))
          return M !== null ? null : g(m, o, r, b, null);
        if (typeof r.then == "function")
          return v(
            m,
            o,
            Xn(r),
            b
          );
        if (r.$$typeof === Dl)
          return v(
            m,
            o,
            Bn(m, r),
            b
          );
        Qn(m, r);
      }
      return null;
    }
    function h(m, o, r, b, M) {
      if (typeof b == "string" && b !== "" || typeof b == "number" || typeof b == "bigint")
        return m = m.get(r) || null, f(o, m, "" + b, M);
      if (typeof b == "object" && b !== null) {
        switch (b.$$typeof) {
          case st:
            return m = m.get(
              b.key === null ? r : b.key
            ) || null, c(o, m, b, M);
          case Vl:
            return m = m.get(
              b.key === null ? r : b.key
            ) || null, d(o, m, b, M);
          case cl:
            return b = oa(b), h(
              m,
              o,
              r,
              b,
              M
            );
        }
        if (il(b) || H(b))
          return m = m.get(r) || null, g(o, m, b, M, null);
        if (typeof b.then == "function")
          return h(
            m,
            o,
            r,
            Xn(b),
            M
          );
        if (b.$$typeof === Dl)
          return h(
            m,
            o,
            r,
            Bn(o, b),
            M
          );
        Qn(o, b);
      }
      return null;
    }
    function O(m, o, r, b) {
      for (var M = null, k = null, p = o, q = o = 0, Gl = null; p !== null && q < r.length; q++) {
        p.index > q ? (Gl = p, p = null) : Gl = p.sibling;
        var al = v(
          m,
          p,
          r[q],
          b
        );
        if (al === null) {
          p === null && (p = Gl);
          break;
        }
        l && p && al.alternate === null && t(m, p), o = n(al, o, q), k === null ? M = al : k.sibling = al, k = al, p = Gl;
      }
      if (q === r.length)
        return u(m, p), J && mu(m, q), M;
      if (p === null) {
        for (; q < r.length; q++)
          p = T(m, r[q], b), p !== null && (o = n(
            p,
            o,
            q
          ), k === null ? M = p : k.sibling = p, k = p);
        return J && mu(m, q), M;
      }
      for (p = a(p); q < r.length; q++)
        Gl = h(
          p,
          m,
          q,
          r[q],
          b
        ), Gl !== null && (l && (al = Gl.alternate, al !== null && p.delete(al.key === null ? q : al.key)), o = n(
          Gl,
          o,
          q
        ), k === null ? M = Gl : k.sibling = Gl, k = Gl);
      return l && p.forEach(function(Fu) {
        return t(m, Fu);
      }), J && mu(m, q), M;
    }
    function C(m, o, r, b) {
      if (r == null) throw Error(y(151));
      for (var M = null, k = null, p = o, q = o = 0, Gl = null, al = r.next(); p !== null && !al.done; q++, al = r.next()) {
        p.index > q ? (Gl = p, p = null) : Gl = p.sibling;
        var Fu = v(m, p, al.value, b);
        if (Fu === null) {
          p === null && (p = Gl);
          break;
        }
        l && p && Fu.alternate === null && t(m, p), o = n(Fu, o, q), k === null ? M = Fu : k.sibling = Fu, k = Fu, p = Gl;
      }
      if (al.done)
        return u(m, p), J && mu(m, q), M;
      if (p === null) {
        for (; !al.done; q++, al = r.next())
          al = T(m, al.value, b), al !== null && (o = n(al, o, q), k === null ? M = al : k.sibling = al, k = al);
        return J && mu(m, q), M;
      }
      for (p = a(p); !al.done; q++, al = r.next())
        al = h(p, m, q, al.value, b), al !== null && (l && (Gl = al.alternate, Gl !== null && p.delete(
          Gl.key === null ? q : Gl.key
        )), o = n(al, o, q), k === null ? M = al : k.sibling = al, k = al);
      return l && p.forEach(function(eh) {
        return t(m, eh);
      }), J && mu(m, q), M;
    }
    function K(m, o, r, b) {
      if (typeof r == "object" && r !== null && r.type === xl && r.key === null && r.props.ref === void 0 && (r = r.props.children), typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case st:
            l: {
              for (var M = r.key; o !== null; ) {
                if (o.key === M) {
                  if (M = r.type, M === xl) {
                    if (o.tag === 7) {
                      u(
                        m,
                        o.sibling
                      ), b = e(
                        o,
                        r.props.children
                      ), Cu(b, r), b.return = m, m = b;
                      break l;
                    }
                  } else if (o.elementType === M || typeof M == "object" && M !== null && M.$$typeof === cl && oa(M) === o.type) {
                    u(
                      m,
                      o.sibling
                    ), b = e(o, r.props), Cu(b, r), b.return = m, m = b;
                    break l;
                  }
                  u(m, o);
                  break;
                } else t(m, o);
                o = o.sibling;
              }
              r.type === xl ? (b = ua(
                r.props.children,
                m.mode,
                b,
                r.key
              ), Cu(b, r), b.return = m, m = b) : (b = Cn(
                r.type,
                r.key,
                r.props,
                null,
                m.mode,
                b
              ), Cu(b, r), b.return = m, m = b);
            }
            return i(m);
          case Vl:
            l: {
              for (M = r.key; o !== null; ) {
                if (o.key === M)
                  if (o.tag === 4 && o.stateNode.containerInfo === r.containerInfo && o.stateNode.implementation === r.implementation) {
                    u(
                      m,
                      o.sibling
                    ), b = e(o, r.children || []), b.return = m, m = b;
                    break l;
                  } else {
                    u(m, o);
                    break;
                  }
                else t(m, o);
                o = o.sibling;
              }
              b = Tf(r, m.mode, b), b.return = m, m = b;
            }
            return i(m);
          case cl:
            return r = oa(r), K(
              m,
              o,
              r,
              b
            );
        }
        if (il(r))
          return O(
            m,
            o,
            r,
            b
          );
        if (H(r)) {
          if (M = H(r), typeof M != "function") throw Error(y(150));
          return r = M.call(r), C(
            m,
            o,
            r,
            b
          );
        }
        if (typeof r.then == "function")
          return K(
            m,
            o,
            Xn(r),
            b
          );
        if (r.$$typeof === Dl)
          return K(
            m,
            o,
            Bn(m, r),
            b
          );
        Qn(m, r);
      }
      return typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint" ? (r = "" + r, o !== null && o.tag === 6 ? (u(m, o.sibling), b = e(o, r), b.return = m, m = b) : (u(m, o), b = bf(r, m.mode, b), b.return = m, m = b), i(m)) : u(m, o);
    }
    return function(m, o, r, b) {
      try {
        Ce = 0;
        var M = K(
          m,
          o,
          r,
          b
        );
        return Ya = null, M;
      } catch (p) {
        if (p === qa || p === Yn) throw p;
        var k = mt(29, p, null, m.mode);
        return k.lanes = b, k.return = m, k;
      }
    };
  }
  var va = ws(!0), $s = ws(!1), Ru = !1;
  function Cf(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Rf(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Hu(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function pu(l, t, u) {
    var a = l.updateQueue;
    if (a === null) return null;
    if (a = a.shared, (sl & 2) !== 0) {
      var e = a.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), a.pending = t, t = Un(l), Rs(l, null, u), t;
    }
    return Mn(l, a, t, u), Un(l);
  }
  function Re(l, t, u) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (u & 4194048) !== 0)) {
      var a = t.lanes;
      a &= l.pendingLanes, u |= a, t.lanes = u, xo(l, u);
    }
  }
  function Hf(l, t) {
    var u = l.updateQueue, a = l.alternate;
    if (a !== null && (a = a.updateQueue, u === a)) {
      var e = null, n = null;
      if (u = u.firstBaseUpdate, u !== null) {
        do {
          var i = {
            lane: u.lane,
            tag: u.tag,
            payload: u.payload,
            callback: null,
            next: null
          };
          n === null ? e = n = i : n = n.next = i, u = u.next;
        } while (u !== null);
        n === null ? e = n = t : n = n.next = t;
      } else e = n = t;
      u = {
        baseState: a.baseState,
        firstBaseUpdate: e,
        lastBaseUpdate: n,
        shared: a.shared,
        callbacks: a.callbacks
      }, l.updateQueue = u;
      return;
    }
    l = u.lastBaseUpdate, l === null ? u.firstBaseUpdate = t : l.next = t, u.lastBaseUpdate = t;
  }
  var pf = !1;
  function He() {
    if (pf) {
      var l = Ba;
      if (l !== null) throw l;
    }
  }
  function pe(l, t, u, a) {
    pf = !1;
    var e = l.updateQueue;
    Ru = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, f = e.shared.pending;
    if (f !== null) {
      e.shared.pending = null;
      var c = f, d = c.next;
      c.next = null, i === null ? n = d : i.next = d, i = c;
      var g = l.alternate;
      g !== null && (g = g.updateQueue, f = g.lastBaseUpdate, f !== i && (f === null ? g.firstBaseUpdate = d : f.next = d, g.lastBaseUpdate = c));
    }
    if (n !== null) {
      var T = e.baseState;
      i = 0, g = d = c = null, f = n;
      do {
        var v = f.lane & -536870913, h = v !== f.lane;
        if (h ? (I & v) === v : (a & v) === v) {
          v !== 0 && v === fa && (pf = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: f.tag,
            payload: f.payload,
            callback: null,
            next: null
          });
          l: {
            var O = l, C = f;
            v = t;
            var K = u;
            switch (C.tag) {
              case 1:
                if (O = C.payload, typeof O == "function") {
                  T = O.call(K, T, v);
                  break l;
                }
                T = O;
                break l;
              case 3:
                O.flags = O.flags & -65537 | 128;
              case 0:
                if (O = C.payload, v = typeof O == "function" ? O.call(K, T, v) : O, v == null) break l;
                T = Q({}, T, v);
                break l;
              case 2:
                Ru = !0;
            }
          }
          v = f.callback, v !== null && (l.flags |= 64, h && (l.flags |= 8192), h = e.callbacks, h === null ? e.callbacks = [v] : h.push(v));
        } else
          h = {
            lane: v,
            tag: f.tag,
            payload: f.payload,
            callback: f.callback,
            next: null
          }, g === null ? (d = g = h, c = T) : g = g.next = h, i |= v;
        if (f = f.next, f === null) {
          if (f = e.shared.pending, f === null)
            break;
          h = f, f = h.next, h.next = null, e.lastBaseUpdate = h, e.shared.pending = null;
        }
      } while (!0);
      g === null && (c = T), e.baseState = c, e.firstBaseUpdate = d, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), Xu |= i, l.lanes = i, l.memoizedState = T;
    }
  }
  function Fs(l, t) {
    if (typeof l != "function")
      throw Error(y(191, l));
    l.call(t);
  }
  function Ws(l, t) {
    var u = l.callbacks;
    if (u !== null)
      for (l.callbacks = null, l = 0; l < u.length; l++)
        Fs(u[l], t);
  }
  var ju = G(null), Zn = G(0);
  function Is(l, t) {
    l = bu, W(Zn, l), W(ju, t), bu = l | t.baseLanes;
  }
  function jf() {
    W(Zn, bu), W(ju, ju.current);
  }
  function xf() {
    bu = Zn.current, Z(ju), Z(Zn);
  }
  var Il = G(null), et = null;
  function xu(l) {
    var t = l.alternate;
    W(kl, kl.current & 1), W(Il, l), et === null && (t === null || ju.current !== null || t.memoizedState !== null) && (et = l);
  }
  function Bf(l) {
    W(kl, kl.current), W(Il, l), et === null && (et = l);
  }
  function ks(l) {
    l.tag === 22 ? (W(kl, kl.current), W(Il, l), et === null && (et = l)) : Bu();
  }
  function Bu() {
    W(kl, kl.current), W(Il, Il.current);
  }
  function _t(l) {
    Z(Il), et === l && (et = null), Z(kl);
  }
  var kl = G(0);
  function je(l, t) {
    W(Il, Il.current), W(kl, t);
  }
  function qf(l) {
    Z(kl), Z(Il), et === l && (et = null);
  }
  function Vn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var u = t.memoizedState;
        if (u !== null && (u = u.dehydrated, u === null || no(u) || io(u)))
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
  var yu = 0, L = null, hl = null, ql = null, Ln = !1, Ga = !1, ma = !1, Kn = 0, xe = 0, Xa = null, Nr = 0;
  function Cl() {
    throw Error(y(321));
  }
  function Yf(l, t) {
    if (t === null) return !1;
    for (var u = 0; u < t.length && u < l.length; u++)
      if (!zt(l[u], t[u])) return !1;
    return !0;
  }
  function Gf(l, t, u, a, e, n) {
    return yu = n, L = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, U.H = l === null || l.memoizedState === null ? x0 : B0, ma = !1, n = u(a, e), ma = !1, Ga && (n = l0(
      t,
      u,
      a,
      e
    )), Ps(l), n;
  }
  function Ps(l) {
    U.H = kn;
    var t = hl !== null && hl.next !== null;
    if (yu = 0, ql = hl = L = null, Ln = !1, xe = 0, Xa = null, t) throw Error(y(300));
    l === null || Yl || (l = l.dependencies, l !== null && xn(l) && (Yl = !0));
  }
  function l0(l, t, u, a) {
    L = l;
    var e = 0;
    do {
      if (Ga && (Xa = null), xe = 0, Ga = !1, 25 <= e) throw Error(y(301));
      if (e += 1, ql = hl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      U.H = pr, n = t(u, a);
    } while (Ga);
    return n;
  }
  function Ar() {
    var l = U.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Be(t) : t, l = l.useState()[0], (hl !== null ? hl.memoizedState : null) !== l && (L.flags |= 1024), t;
  }
  function Xf() {
    var l = Kn !== 0;
    return Kn = 0, l;
  }
  function Qf(l, t, u) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~u;
  }
  function Zf(l) {
    if (Ln) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      Ln = !1;
    }
    yu = 0, ql = hl = L = null, Ga = !1, xe = Kn = 0, Xa = null;
  }
  function ft() {
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
    if (hl === null) {
      var l = L.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = hl.next;
    var t = ql === null ? L.memoizedState : ql.next;
    if (t !== null)
      ql = t, hl = l;
    else {
      if (l === null)
        throw L.alternate === null ? Error(y(467)) : Error(y(310));
      hl = l, l = {
        memoizedState: hl.memoizedState,
        baseState: hl.baseState,
        baseQueue: hl.baseQueue,
        queue: hl.queue,
        next: null
      }, ql === null ? L.memoizedState = ql = l : ql = ql.next = l;
    }
    return ql;
  }
  function Jn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Be(l) {
    var t = xe;
    return xe += 1, Xa === null && (Xa = []), l = Ls(Xa, l, t), t = L, (ql === null ? t.memoizedState : ql.next) === null && (t = t.alternate, U.H = t === null || t.memoizedState === null ? x0 : B0), l;
  }
  function wn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Be(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === Dl) return Wl(l);
    }
    throw Error(y(438, String(l)));
  }
  function Vf(l) {
    var t = null, u = L.updateQueue;
    if (u !== null && (t = u.memoCache), t == null) {
      var a = L.alternate;
      a !== null && (a = a.updateQueue, a !== null && (a = a.memoCache, a != null && (t = {
        data: a.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), u === null && (u = Jn(), L.updateQueue = u), u.memoCache = t, u = t.data[t.index], u === void 0)
      for (u = t.data[t.index] = Array(l), a = 0; a < l; a++)
        u[a] = $t;
    return t.index++, u;
  }
  function hu(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function $n(l) {
    var t = pl();
    return Lf(t, hl, l);
  }
  function Lf(l, t, u) {
    var a = l.queue;
    if (a === null) throw Error(y(311));
    a.lastRenderedReducer = u;
    var e = l.baseQueue, n = a.pending;
    if (n !== null) {
      if (e !== null) {
        var i = e.next;
        e.next = n.next, n.next = i;
      }
      t.baseQueue = e = n, a.pending = null;
    }
    if (n = l.baseState, e === null) l.memoizedState = n;
    else {
      t = e.next;
      var f = i = null, c = null, d = t, g = !1;
      do {
        var T = d.lane & -536870913;
        if (T !== d.lane ? (I & T) === T : (yu & T) === T) {
          var v = d.revertLane;
          if (v === 0)
            c !== null && (c = c.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: d.action,
              hasEagerState: d.hasEagerState,
              eagerState: d.eagerState,
              next: null
            }), T === fa && (g = !0);
          else if ((yu & v) === v) {
            d = d.next, v === fa && (g = !0);
            continue;
          } else
            T = {
              lane: 0,
              revertLane: d.revertLane,
              gesture: null,
              action: d.action,
              hasEagerState: d.hasEagerState,
              eagerState: d.eagerState,
              next: null
            }, c === null ? (f = c = T, i = n) : c = c.next = T, L.lanes |= v, Xu |= v;
          T = d.action, ma && u(n, T), n = d.hasEagerState ? d.eagerState : u(n, T);
        } else
          v = {
            lane: T,
            revertLane: d.revertLane,
            gesture: d.gesture,
            action: d.action,
            hasEagerState: d.hasEagerState,
            eagerState: d.eagerState,
            next: null
          }, c === null ? (f = c = v, i = n) : c = c.next = v, L.lanes |= T, Xu |= T;
        d = d.next;
      } while (d !== null && d !== t);
      if (c === null ? i = n : c.next = f, !zt(n, l.memoizedState) && (Yl = !0, g && (u = Ba, u !== null)))
        throw u;
      l.memoizedState = n, l.baseState = i, l.baseQueue = c, a.lastRenderedState = n;
    }
    return e === null && (a.lanes = 0), [l.memoizedState, a.dispatch];
  }
  function Kf(l) {
    var t = pl(), u = t.queue;
    if (u === null) throw Error(y(311));
    u.lastRenderedReducer = l;
    var a = u.dispatch, e = u.pending, n = t.memoizedState;
    if (e !== null) {
      u.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      zt(n, t.memoizedState) || (Yl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), u.lastRenderedState = n;
    }
    return [n, a];
  }
  function t0(l, t, u) {
    var a = L, e = pl(), n = J;
    if (n) {
      if (u === void 0) throw Error(y(407));
      u = u();
    } else u = t();
    var i = !zt(
      (hl || e).memoizedState,
      u
    );
    if (i && (e.memoizedState = u, Yl = !0), e = e.queue, $f(e0.bind(null, a, e, l), [
      l
    ]), l = e.getSnapshot !== t || i || ql !== null && (ql.memoizedState.tag & 1) !== 0, Qa(
      l ? 9 : 8,
      { destroy: void 0 },
      a0.bind(null, a, e, u, t),
      null
    ), l) {
      if (a.flags |= 2048, bl === null) throw Error(y(349));
      n || (yu & 127) !== 0 || u0(a, t, u);
    }
    return u;
  }
  function u0(l, t, u) {
    l.flags |= 16384, l = { getSnapshot: t, value: u }, t = L.updateQueue, t === null ? (t = Jn(), L.updateQueue = t, t.stores = [l]) : (u = t.stores, u === null ? t.stores = [l] : u.push(l));
  }
  function a0(l, t, u, a) {
    t.value = u, t.getSnapshot = a, n0(t) && i0(l);
  }
  function e0(l, t, u) {
    return u(function() {
      n0(t) && i0(l);
    });
  }
  function n0(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var u = t();
      return !zt(l, u);
    } catch {
      return !0;
    }
  }
  function i0(l) {
    var t = ta(l, 2);
    t !== null && ht(t, l, 2);
  }
  function Jf(l) {
    var t = ft();
    if (typeof l == "function") {
      var u = l;
      if (l = u(), ma) {
        _u(!0);
        try {
          u();
        } finally {
          _u(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: hu,
      lastRenderedState: l
    }, t;
  }
  function f0(l, t, u, a) {
    return l.baseState = u, Lf(
      l,
      hl,
      typeof a == "function" ? a : hu
    );
  }
  function Dr(l, t, u, a, e) {
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
      U.T !== null ? u(!0) : n.isTransition = !1, a(n), u = t.pending, u === null ? (n.next = t.pending = n, c0(t, n)) : (n.next = u.next, t.pending = u.next = n);
    }
  }
  function c0(l, t) {
    var u = t.action, a = t.payload, e = l.state;
    if (t.isTransition) {
      var n = U.T, i = {};
      i.types = n !== null ? n.types : null, U.T = i;
      try {
        var f = u(e, a), c = U.S;
        c !== null && c(i, f), o0(l, t, f);
      } catch (d) {
        wf(l, t, d);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), U.T = n;
      }
    } else
      try {
        n = u(e, a), o0(l, t, n);
      } catch (d) {
        wf(l, t, d);
      }
  }
  function o0(l, t, u) {
    u !== null && typeof u == "object" && typeof u.then == "function" ? u.then(
      function(a) {
        s0(l, t, a);
      },
      function(a) {
        return wf(l, t, a);
      }
    ) : s0(l, t, u);
  }
  function s0(l, t, u) {
    t.status = "fulfilled", t.value = u, v0(t), l.state = u, t = l.pending, t !== null && (u = t.next, u === t ? l.pending = null : (u = u.next, t.next = u, c0(l, u)));
  }
  function wf(l, t, u) {
    var a = l.pending;
    if (l.pending = null, a !== null) {
      a = a.next;
      do
        t.status = "rejected", t.reason = u, v0(t), t = t.next;
      while (t !== a);
    }
    l.action = null;
  }
  function v0(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function m0(l, t) {
    return t;
  }
  function d0(l, t) {
    if (J) {
      var u = bl.formState;
      if (u !== null) {
        l: {
          var a = L;
          if (J) {
            if (Tl) {
              t: {
                for (var e = Tl, n = qt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Gt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                Tl = Gt(
                  e.nextSibling
                ), a = e.data === "F!";
                break l;
              }
            }
            Mu(a);
          }
          a = !1;
        }
        a && (t = u[0]);
      }
    }
    return u = ft(), u.memoizedState = u.baseState = t, a = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: m0,
      lastRenderedState: t
    }, u.queue = a, u = H0.bind(
      null,
      L,
      a
    ), a.dispatch = u, a = Jf(!1), n = Pf.bind(
      null,
      L,
      !1,
      a.queue
    ), a = ft(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, a.queue = e, u = Dr.bind(
      null,
      L,
      e,
      n,
      u
    ), e.dispatch = u, a.memoizedState = l, [t, u, !1];
  }
  function r0(l) {
    var t = pl();
    return y0(t, hl, l);
  }
  function y0(l, t, u) {
    if (t = Lf(
      l,
      t,
      m0
    )[0], l = $n(hu)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var a = Be(t);
      } catch (i) {
        throw i === qa ? Yn : i;
      }
    else a = t;
    t = pl();
    var e = t.queue, n = e.dispatch;
    return u !== t.memoizedState && (L.flags |= 2048, Qa(
      9,
      { destroy: void 0 },
      Mr.bind(null, e, u),
      null
    )), [a, n, l];
  }
  function Mr(l, t) {
    l.action = t;
  }
  function h0(l) {
    var t = pl(), u = hl;
    if (u !== null)
      return y0(t, u, l);
    pl(), t = t.memoizedState, u = pl();
    var a = u.queue.dispatch;
    return u.memoizedState = l, [t, a, !1];
  }
  function Qa(l, t, u, a) {
    return l = { tag: l, create: u, deps: a, inst: t, next: null }, t = L.updateQueue, t === null && (t = Jn(), L.updateQueue = t), u = t.lastEffect, u === null ? t.lastEffect = l.next = l : (a = u.next, u.next = l, l.next = a, t.lastEffect = l), l;
  }
  function g0() {
    return pl().memoizedState;
  }
  function Fn(l, t, u, a) {
    var e = ft();
    L.flags |= l, e.memoizedState = Qa(
      1 | t,
      { destroy: void 0 },
      u,
      a === void 0 ? null : a
    );
  }
  function Wn(l, t, u, a) {
    var e = pl();
    a = a === void 0 ? null : a;
    var n = e.memoizedState.inst;
    hl !== null && a !== null && Yf(a, hl.memoizedState.deps) ? e.memoizedState = Qa(t, n, u, a) : (L.flags |= l, e.memoizedState = Qa(
      1 | t,
      n,
      u,
      a
    ));
  }
  function S0(l, t) {
    Fn(8390656, 8, l, t);
  }
  function $f(l, t) {
    Wn(2048, 8, l, t);
  }
  function Ur(l) {
    L.flags |= 4;
    var t = L.updateQueue;
    if (t === null)
      t = Jn(), L.updateQueue = t, t.events = [l];
    else {
      var u = t.events;
      u === null ? t.events = [l] : u.push(l);
    }
  }
  function b0(l) {
    var t = pl().memoizedState;
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
      var u = t(l);
      return function() {
        typeof u == "function" ? u() : t(null);
      };
    }
    if (t != null)
      return l = l(), t.current = l, function() {
        t.current = null;
      };
  }
  function _0(l, t, u) {
    u = u != null ? u.concat([l]) : null, Wn(4, 4, z0.bind(null, t, l), u);
  }
  function Ff() {
  }
  function O0(l, t) {
    var u = pl();
    t = t === void 0 ? null : t;
    var a = u.memoizedState;
    return t !== null && Yf(t, a[1]) ? a[0] : (u.memoizedState = [l, t], l);
  }
  function N0(l, t) {
    var u = pl();
    t = t === void 0 ? null : t;
    var a = u.memoizedState;
    if (t !== null && Yf(t, a[1]))
      return a[0];
    if (a = l(), ma) {
      _u(!0);
      try {
        l();
      } finally {
        _u(!1);
      }
    }
    return u.memoizedState = [a, t], a;
  }
  function Wf(l, t, u) {
    return u === void 0 || (yu & 1073741824) !== 0 && (I & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = u, l = xv(), L.lanes |= l, Xu |= l, u);
  }
  function A0(l, t, u, a) {
    return zt(u, t) ? u : ju.current !== null ? (l = Wf(l, u, a), zt(l, t) || (Yl = !0), l) : (yu & 106) === 0 || (yu & 1073741824) !== 0 && (I & 261930) === 0 ? (Yl = !0, l.memoizedState = u) : (l = xv(), L.lanes |= l, Xu |= l, t);
  }
  function D0(l, t, u, a, e) {
    var n = Y.p;
    Y.p = n !== 0 && 8 > n ? n : 8;
    var i = U.T, f = {};
    f.types = i !== null ? i.types : null, U.T = f, Pf(l, !1, t, u);
    try {
      var c = e(), d = U.S;
      if (d !== null && d(f, c), c !== null && typeof c == "object" && typeof c.then == "function") {
        var g = Or(
          c,
          a
        );
        qe(
          l,
          t,
          g,
          Dt(l)
        );
      } else
        qe(
          l,
          t,
          a,
          Dt(l)
        );
    } catch (T) {
      qe(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: T },
        Dt()
      );
    } finally {
      Y.p = n, i !== null && f.types !== null && (i.types = f.types), U.T = i;
    }
  }
  function Cr() {
  }
  function If(l, t, u, a) {
    if (l.tag !== 5) throw Error(y(476));
    var e = M0(l).queue;
    D0(
      l,
      e,
      t,
      Rt,
      u === null ? Cr : function() {
        return U0(l), u(a);
      }
    );
  }
  function M0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: Rt,
      baseState: Rt,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: hu,
        lastRenderedState: Rt
      },
      next: null
    };
    var u = {};
    return t.next = {
      memoizedState: u,
      baseState: u,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: hu,
        lastRenderedState: u
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function U0(l) {
    var t = M0(l);
    t.next === null && (t = l.alternate.memoizedState), qe(
      l,
      t.next.queue,
      {},
      Dt()
    );
  }
  function kf() {
    return Wl(ie);
  }
  function C0() {
    return pl().memoizedState;
  }
  function R0() {
    return pl().memoizedState;
  }
  function Rr(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var u = Dt();
          l = Hu(u);
          var a = pu(t, l, u);
          a !== null && (ht(a, t, u), Re(a, t, u)), t = { cache: Af() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Hr(l, t, u) {
    var a = Dt();
    u = {
      lane: a,
      revertLane: 0,
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, In(l) ? p0(t, u) : (u = gf(l, t, u, a), u !== null && (ht(u, l, a), j0(u, t, a)));
  }
  function H0(l, t, u) {
    var a = Dt();
    qe(l, t, u, a);
  }
  function qe(l, t, u, a) {
    var e = {
      lane: a,
      revertLane: 0,
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (In(l)) p0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, f = n(i, u);
          if (e.hasEagerState = !0, e.eagerState = f, zt(f, i))
            return Mn(l, t, e, 0), bl === null && Dn(), !1;
        } catch {
        }
      if (u = gf(l, t, e, a), u !== null)
        return ht(u, l, a), j0(u, t, a), !0;
    }
    return !1;
  }
  function Pf(l, t, u, a) {
    if (a = {
      lane: 2,
      revertLane: Vc(),
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, In(l)) {
      if (t) throw Error(y(479));
    } else
      t = gf(
        l,
        u,
        a,
        2
      ), t !== null && ht(t, l, 2);
  }
  function In(l) {
    var t = l.alternate;
    return l === L || t !== null && t === L;
  }
  function p0(l, t) {
    Ga = Ln = !0;
    var u = l.pending;
    u === null ? t.next = t : (t.next = u.next, u.next = t), l.pending = t;
  }
  function j0(l, t, u) {
    if ((u & 4194048) !== 0) {
      var a = t.lanes;
      a &= l.pendingLanes, u |= a, t.lanes = u, xo(l, u);
    }
  }
  var kn = {
    readContext: Wl,
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
    readContext: Wl,
    use: wn,
    useCallback: function(l, t) {
      return ft().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Wl,
    useEffect: S0,
    useImperativeHandle: function(l, t, u) {
      u = u != null ? u.concat([l]) : null, Fn(
        4194308,
        4,
        z0.bind(null, t, l),
        u
      );
    },
    useLayoutEffect: function(l, t) {
      return Fn(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      Fn(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var u = ft();
      t = t === void 0 ? null : t;
      var a = l();
      if (ma) {
        _u(!0);
        try {
          l();
        } finally {
          _u(!1);
        }
      }
      return u.memoizedState = [a, t], a;
    },
    useReducer: function(l, t, u) {
      var a = ft();
      if (u !== void 0) {
        var e = u(t);
        if (ma) {
          _u(!0);
          try {
            u(t);
          } finally {
            _u(!1);
          }
        }
      } else e = t;
      return a.memoizedState = a.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, a.queue = l, l = l.dispatch = Hr.bind(
        null,
        L,
        l
      ), [a.memoizedState, l];
    },
    useRef: function(l) {
      var t = ft();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Jf(l);
      var t = l.queue, u = H0.bind(null, L, t);
      return t.dispatch = u, [l.memoizedState, u];
    },
    useDebugValue: Ff,
    useDeferredValue: function(l, t) {
      var u = ft();
      return Wf(u, l, t);
    },
    useTransition: function() {
      var l = Jf(!1);
      return l = D0.bind(
        null,
        L,
        l.queue,
        !0,
        !1
      ), ft().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, u) {
      var a = L, e = ft();
      if (J) {
        if (u === void 0)
          throw Error(y(407));
        u = u();
      } else {
        if (u = t(), bl === null)
          throw Error(y(349));
        (I & 127) !== 0 || u0(a, t, u);
      }
      e.memoizedState = u;
      var n = { value: u, getSnapshot: t };
      return e.queue = n, S0(e0.bind(null, a, n, l), [
        l
      ]), a.flags |= 2048, Qa(
        9,
        { destroy: void 0 },
        a0.bind(
          null,
          a,
          n,
          u,
          t
        ),
        null
      ), u;
    },
    useId: function() {
      var l = ft(), t = bl.identifierPrefix;
      if (J) {
        var u = It, a = Wt;
        u = (a & ~(1 << 32 - Tt(a) - 1)).toString(32) + u, t = "_" + t + "R_" + u, u = Kn++, 0 < u && (t += "H" + u.toString(32)), t += "_";
      } else
        u = Nr++, t = "_" + t + "r_" + u.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: kf,
    useFormState: d0,
    useActionState: d0,
    useOptimistic: function(l) {
      var t = ft();
      t.memoizedState = t.baseState = l;
      var u = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = u, t = Pf.bind(
        null,
        L,
        !0,
        u
      ), u.dispatch = t, [l, t];
    },
    useMemoCache: Vf,
    useCacheRefresh: function() {
      return ft().memoizedState = Rr.bind(
        null,
        L
      );
    },
    useEffectEvent: function(l) {
      var t = ft(), u = { impl: l };
      return t.memoizedState = u, function() {
        if ((sl & 2) !== 0)
          throw Error(y(440));
        return u.impl.apply(void 0, arguments);
      };
    }
  }, B0 = {
    readContext: Wl,
    use: wn,
    useCallback: O0,
    useContext: Wl,
    useEffect: $f,
    useImperativeHandle: _0,
    useInsertionEffect: T0,
    useLayoutEffect: E0,
    useMemo: N0,
    useReducer: $n,
    useRef: g0,
    useState: function() {
      return $n(hu);
    },
    useDebugValue: Ff,
    useDeferredValue: function(l, t) {
      var u = pl();
      return A0(
        u,
        hl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = $n(hu)[0], t = pl().memoizedState;
      return [
        typeof l == "boolean" ? l : Be(l),
        t
      ];
    },
    useSyncExternalStore: t0,
    useId: C0,
    useHostTransitionStatus: kf,
    useFormState: r0,
    useActionState: r0,
    useOptimistic: function(l, t) {
      var u = pl();
      return f0(u, hl, l, t);
    },
    useMemoCache: Vf,
    useCacheRefresh: R0,
    useEffectEvent: b0
  }, pr = {
    readContext: Wl,
    use: wn,
    useCallback: O0,
    useContext: Wl,
    useEffect: $f,
    useImperativeHandle: _0,
    useInsertionEffect: T0,
    useLayoutEffect: E0,
    useMemo: N0,
    useReducer: Kf,
    useRef: g0,
    useState: function() {
      return Kf(hu);
    },
    useDebugValue: Ff,
    useDeferredValue: function(l, t) {
      var u = pl();
      return hl === null ? Wf(u, l, t) : A0(
        u,
        hl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Kf(hu)[0], t = pl().memoizedState;
      return [
        typeof l == "boolean" ? l : Be(l),
        t
      ];
    },
    useSyncExternalStore: t0,
    useId: C0,
    useHostTransitionStatus: kf,
    useFormState: h0,
    useActionState: h0,
    useOptimistic: function(l, t) {
      var u = pl();
      return hl !== null ? f0(u, hl, l, t) : (u.baseState = l, [l, u.queue.dispatch]);
    },
    useMemoCache: Vf,
    useCacheRefresh: R0,
    useEffectEvent: b0
  };
  function lc(l, t, u, a) {
    t = l.memoizedState, u = u(a, t), u = u == null ? t : Q({}, t, u), l.memoizedState = u, l.lanes === 0 && (l.updateQueue.baseState = u);
  }
  var tc = {
    enqueueSetState: function(l, t, u) {
      l = l._reactInternals;
      var a = Dt(), e = Hu(a);
      e.payload = t, u != null && (e.callback = u), t = pu(l, e, a), t !== null && (ht(t, l, a), Re(t, l, a));
    },
    enqueueReplaceState: function(l, t, u) {
      l = l._reactInternals;
      var a = Dt(), e = Hu(a);
      e.tag = 1, e.payload = t, u != null && (e.callback = u), t = pu(l, e, a), t !== null && (ht(t, l, a), Re(t, l, a));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var u = Dt(), a = Hu(u);
      a.tag = 2, t != null && (a.callback = t), t = pu(l, a, u), t !== null && (ht(t, l, u), Re(t, l, u));
    }
  };
  function q0(l, t, u, a, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(a, n, i) : t.prototype && t.prototype.isPureReactComponent ? !_e(u, a) || !_e(e, n) : !0;
  }
  function Y0(l, t, u, a) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(u, a), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(u, a), t.state !== l && tc.enqueueReplaceState(t, t.state, null);
  }
  function da(l, t) {
    var u = t;
    if ("ref" in t) {
      u = {};
      for (var a in t)
        a !== "ref" && (u[a] = t[a]);
    }
    if (l = l.defaultProps) {
      u === t && (u = Q({}, u));
      for (var e in l)
        u[e] === void 0 && (u[e] = l[e]);
    }
    return u;
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
      var u = l.onUncaughtError;
      u(t.value, { componentStack: t.stack });
    } catch (a) {
      setTimeout(function() {
        throw a;
      });
    }
  }
  function Z0(l, t, u) {
    try {
      var a = l.onCaughtError;
      a(u.value, {
        componentStack: u.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function uc(l, t, u) {
    return u = Hu(u), u.tag = 3, u.payload = { element: null }, u.callback = function() {
      Pn(l, t);
    }, u;
  }
  function V0(l) {
    return l = Hu(l), l.tag = 3, l;
  }
  function L0(l, t, u, a) {
    var e = u.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = a.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        Z0(t, u, a);
      };
    }
    var i = u.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      Z0(t, u, a), typeof e != "function" && (Qu === null ? Qu = /* @__PURE__ */ new Set([this]) : Qu.add(this));
      var f = a.stack;
      this.componentDidCatch(a.value, {
        componentStack: f !== null ? f : ""
      });
    });
  }
  function jr(l, t, u, a, e) {
    if (u.flags |= 32768, a !== null && typeof a == "object" && typeof a.then == "function") {
      if (t = u.alternate, t !== null && na(
        t,
        u,
        e,
        !0
      ), u = Il.current, u !== null) {
        switch (u.tag) {
          case 31:
          case 13:
          case 19:
            return et === null ? Ti() : u.alternate === null && Rl === 0 && (Rl = 3), u.flags &= -257, u.flags |= 65536, u.lanes = e, a === Gn ? u.flags |= 16384 : (t = u.updateQueue, t === null ? u.updateQueue = /* @__PURE__ */ new Set([a]) : t.add(a), Xc(l, a, e)), !1;
          case 22:
            return u.flags |= 65536, a === Gn ? u.flags |= 16384 : (t = u.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([a])
            }, u.updateQueue = t) : (u = t.retryQueue, u === null ? t.retryQueue = /* @__PURE__ */ new Set([a]) : u.add(a)), Xc(l, a, e)), !1;
        }
        throw Error(y(435, u.tag));
      }
      return Xc(l, a, e), Ti(), !1;
    }
    if (J)
      return t = Il.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, a !== zf && (l = Error(y(422), { cause: a }), Ae(jt(l, u)))) : (a !== zf && (t = Error(y(423), {
        cause: a
      }), Ae(
        jt(t, u)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, a = jt(a, u), e = uc(
        l.stateNode,
        a,
        e
      ), Hf(l, e), Rl !== 4 && (Rl = 2)), !1;
    var n = Error(y(520), { cause: a });
    if (n = jt(n, u), Ke === null ? Ke = [n] : Ke.push(n), Rl !== 4 && (Rl = 2), t === null) return !0;
    a = jt(a, u), u = t;
    do {
      switch (u.tag) {
        case 3:
          return u.flags |= 65536, l = e & -e, u.lanes |= l, l = uc(u.stateNode, a, l), Hf(u, l), !1;
        case 1:
          if (t = u.type, n = u.stateNode, (u.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Qu === null || !Qu.has(n))))
            return u.flags |= 65536, e &= -e, u.lanes |= e, e = V0(e), L0(
              e,
              l,
              u,
              a
            ), Hf(u, e), !1;
          break;
        case 22:
          if (u.memoizedState !== null)
            return u.flags |= 65536, !1;
      }
      u = u.return;
    } while (u !== null);
    return !1;
  }
  var ac = Error(y(461)), Yl = !1;
  function Ql(l, t, u, a) {
    t.child = l === null ? $s(t, null, u, a) : va(
      t,
      l.child,
      u,
      a
    );
  }
  function K0(l, t, u, a, e) {
    u = u.render;
    var n = t.ref;
    if ("ref" in a) {
      var i = {};
      for (var f in a)
        f !== "ref" && (i[f] = a[f]);
    } else i = a;
    return ia(t), a = Gf(
      l,
      t,
      u,
      i,
      n,
      e
    ), f = Xf(), l !== null && !Yl ? (Qf(l, t, e), gu(l, t, e)) : (J && f && Hn(t), t.flags |= 1, Ql(l, t, a, e), t.child);
  }
  function J0(l, t, u, a, e) {
    if (l === null) {
      var n = u.type;
      return typeof n == "function" && !Sf(n) && n.defaultProps === void 0 && u.compare === null ? (t.tag = 15, t.type = n, w0(
        l,
        t,
        n,
        a,
        e
      )) : (l = Cn(
        u.type,
        null,
        a,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !vc(l, e)) {
      var i = n.memoizedProps;
      if (u = u.compare, u = u !== null ? u : _e, u(i, a) && l.ref === t.ref)
        return gu(l, t, e);
    }
    return t.flags |= 1, l = vu(n, a), l.ref = t.ref, l.return = t, t.child = l;
  }
  function w0(l, t, u, a, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (_e(n, a) && l.ref === t.ref)
        if (Yl = !1, t.pendingProps = a = n, vc(l, e))
          (l.flags & 131072) !== 0 && (Yl = !0);
        else
          return t.lanes = l.lanes, gu(l, t, e);
    }
    return ec(
      l,
      t,
      u,
      a,
      e
    );
  }
  function $0(l, t, u, a) {
    var e = a.children, n = l !== null ? l.memoizedState : null;
    if (l === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), a.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | u : u, l !== null) {
          for (a = t.child = l.child, e = 0; a !== null; )
            e = e | a.lanes | a.childLanes, a = a.sibling;
          a = e & ~n;
        } else a = 0, t.child = null;
        return F0(
          l,
          t,
          n,
          u,
          a
        );
      }
      if ((u & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && qn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? Is(t, n) : jf(), ks(t);
      else
        return a = t.lanes = 536870912, F0(
          l,
          t,
          n !== null ? n.baseLanes | u : u,
          u,
          a
        );
    } else
      n !== null ? (qn(t, n.cachePool), Is(t, n), Bu(), t.memoizedState = null) : (l !== null && qn(t, null), jf(), Bu());
    return Ql(l, t, e, u), t.child;
  }
  function Ye(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function F0(l, t, u, a, e) {
    var n = Mf();
    return n = n === null ? null : { parent: Bl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: u,
      cachePool: n
    }, l !== null && qn(t, null), jf(), ks(t), l !== null && na(l, t, a, !0), t.childLanes = e, null;
  }
  function li(l, t) {
    return t = ti(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function W0(l, t, u) {
    return va(t, l.child, null, u), l = li(t, t.pendingProps), l.flags |= 2, _t(t), t.memoizedState = null, l;
  }
  function xr(l, t, u) {
    var a = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (J) {
        if (a.mode === "hidden")
          return l = li(t, a), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, Ye(null, l);
        if (Bf(t), (l = Tl) ? (l = zm(
          l,
          qt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Au !== null ? { id: Wt, overflow: It } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, u = ps(l), u.return = t, t.child = u, Kl = t, Tl = null)) : l = null, l === null) throw Mu(t);
        return t.lanes = 536870912, null;
      }
      return li(t, a);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Bf(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = W0(
            l,
            t,
            u
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(y(558));
      else if (Yl || na(l, t, u, !1), e = (u & l.childLanes) !== 0, Yl || e) {
        if (ju.current === null) {
          if (a = bl, a !== null && (i = Bo(a, u), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, ta(l, i), ht(a, l, i), ac;
          Ti();
        }
        t = W0(
          l,
          t,
          u
        );
      } else
        l = n.treeContext, Tl = Gt(i.nextSibling), Kl = t, J = !0, Du = null, qt = !1, l !== null && Bs(t, l), t = li(t, a), t.flags |= 134221824;
      return t;
    }
    return l = vu(l.child, {
      mode: a.mode,
      children: a.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function Za(l, t) {
    var u = t.ref;
    if (u === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof u != "function" && typeof u != "object")
        throw Error(y(284));
      (l === null || l.ref !== u) && (t.flags |= 4194816);
    }
  }
  function ec(l, t, u, a, e) {
    return ia(t), u = Gf(
      l,
      t,
      u,
      a,
      void 0,
      e
    ), a = Xf(), l !== null && !Yl ? (Qf(l, t, e), gu(l, t, e)) : (J && a && Hn(t), t.flags |= 1, Ql(l, t, u, e), t.child);
  }
  function I0(l, t, u, a, e, n) {
    return ia(t), t.updateQueue = null, u = l0(
      t,
      a,
      u,
      e
    ), Ps(l), a = Xf(), l !== null && !Yl ? (Qf(l, t, n), gu(l, t, n)) : (J && a && Hn(t), t.flags |= 1, Ql(l, t, u, n), t.child);
  }
  function k0(l, t, u, a, e) {
    if (ia(t), t.stateNode === null) {
      var n = Ha, i = u.contextType;
      typeof i == "object" && i !== null && (n = Wl(i)), n = new u(a, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = tc, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = a, n.state = t.memoizedState, n.refs = {}, Cf(t), i = u.contextType, n.context = typeof i == "object" && i !== null ? Wl(i) : Ha, n.state = t.memoizedState, i = u.getDerivedStateFromProps, typeof i == "function" && (lc(
        t,
        u,
        i,
        a
      ), n.state = t.memoizedState), typeof u.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && tc.enqueueReplaceState(n, n.state, null), pe(t, a, n, e), He(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), a = !0;
    } else if (l === null) {
      n = t.stateNode;
      var f = t.memoizedProps, c = da(u, f);
      n.props = c;
      var d = n.context, g = u.contextType;
      i = Ha, typeof g == "object" && g !== null && (i = Wl(g));
      var T = u.getDerivedStateFromProps;
      g = typeof T == "function" || typeof n.getSnapshotBeforeUpdate == "function", f = t.pendingProps !== f, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (f || d !== i) && Y0(
        t,
        n,
        a,
        i
      ), Ru = !1;
      var v = t.memoizedState;
      n.state = v, pe(t, a, n, e), He(), d = t.memoizedState, f || v !== d || Ru ? (typeof T == "function" && (lc(
        t,
        u,
        T,
        a
      ), d = t.memoizedState), (c = Ru || q0(
        t,
        u,
        c,
        a,
        v,
        d,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = a, t.memoizedState = d), n.props = a, n.state = d, n.context = i, a = c) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), a = !1);
    } else {
      n = t.stateNode, Rf(l, t), i = t.memoizedProps, g = da(u, i), n.props = g, T = t.pendingProps, v = n.context, d = u.contextType, c = Ha, typeof d == "object" && d !== null && (c = Wl(d)), f = u.getDerivedStateFromProps, (d = typeof f == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== T || v !== c) && Y0(
        t,
        n,
        a,
        c
      ), Ru = !1, v = t.memoizedState, n.state = v, pe(t, a, n, e), He();
      var h = t.memoizedState;
      i !== T || v !== h || Ru || l !== null && l.dependencies !== null && xn(l.dependencies) ? (typeof f == "function" && (lc(
        t,
        u,
        f,
        a
      ), h = t.memoizedState), (g = Ru || q0(
        t,
        u,
        g,
        a,
        v,
        h,
        c
      ) || l !== null && l.dependencies !== null && xn(l.dependencies)) ? (d || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(a, h, c), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        a,
        h,
        c
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && v === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && v === l.memoizedState || (t.flags |= 1024), t.memoizedProps = a, t.memoizedState = h), n.props = a, n.state = h, n.context = c, a = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && v === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && v === l.memoizedState || (t.flags |= 1024), a = !1);
    }
    return n = a, Za(l, t), a = (t.flags & 128) !== 0, n || a ? (n = t.stateNode, u = a && typeof u.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && a ? (t.child = va(
      t,
      l.child,
      null,
      e
    ), t.child = va(
      t,
      null,
      u,
      e
    )) : Ql(l, t, u, e), t.memoizedState = n.state, l = t.child) : l = gu(
      l,
      t,
      e
    ), l;
  }
  function P0(l, t, u, a) {
    return aa(), t.flags |= 256, Ql(l, t, u, a), t.child;
  }
  var nc = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function ic(l) {
    return { baseLanes: l, cachePool: Zs() };
  }
  function fc(l, t, u) {
    return l = l !== null ? l.childLanes & ~u : 0, t && (l |= At), l;
  }
  function lv(l, t, u) {
    var a = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (kl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (J) {
        if (e ? xu(t) : Bu(), (l = Tl) ? (l = zm(
          l,
          qt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Au !== null ? { id: Wt, overflow: It } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, u = ps(l), u.return = t, t.child = u, Kl = t, Tl = null)) : l = null, l === null) throw Mu(t);
        return io(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = a.children, a = a.fallback, e ? (Bu(), e = t.mode, n = ti(
        { mode: "hidden", children: n },
        e
      ), a = ua(
        a,
        e,
        u,
        null
      ), n.return = t, a.return = t, n.sibling = a, t.child = n, a = t.child, a.memoizedState = ic(u), a.childLanes = fc(
        l,
        i,
        u
      ), t.memoizedState = nc, Ye(null, a)) : (xu(t), cc(t, n));
    }
    var f = l.memoizedState;
    if (f !== null) {
      var c = f.dehydrated;
      if (c !== null)
        return Br(
          l,
          t,
          n,
          i,
          a,
          c,
          f,
          u
        );
    }
    return e ? (Bu(), e = a.fallback, n = t.mode, f = l.child, c = f.sibling, a = vu(f, {
      mode: "hidden",
      children: a.children
    }), a.subtreeFlags = f.subtreeFlags & 1206910976, c !== null ? e = vu(c, e) : (e = ua(
      e,
      n,
      u,
      null
    ), e.flags |= 2), e.return = t, a.return = t, a.sibling = e, t.child = a, Ye(null, a), a = t.child, e = l.child.memoizedState, e === null ? e = ic(u) : (n = e.cachePool, n !== null ? (f = Bl._currentValue, n = n.parent !== f ? { parent: f, pool: f } : n) : n = Zs(), e = {
      baseLanes: e.baseLanes | u,
      cachePool: n
    }), a.memoizedState = e, a.childLanes = fc(
      l,
      i,
      u
    ), t.memoizedState = nc, Ye(l.child, a)) : (xu(t), u = l.child, l = u.sibling, u = vu(u, {
      mode: "visible",
      children: a.children
    }), u.return = t, u.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = u, t.memoizedState = null, u);
  }
  function cc(l, t) {
    return t = ti(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function ti(l, t) {
    return l = mt(22, l, null, t), l.lanes = 0, l;
  }
  function ui(l, t, u) {
    return va(t, l.child, null, u), l = cc(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Br(l, t, u, a, e, n, i, f) {
    if (u)
      return t.flags & 256 ? (xu(t), t.flags &= -257, ui(
        l,
        t,
        f
      )) : t.memoizedState !== null ? (Bu(), t.child = l.child, t.flags |= 128, null) : (Bu(), n = e.fallback, i = t.mode, e = ti(
        { mode: "visible", children: e.children },
        i
      ), n = ua(
        n,
        i,
        f,
        null
      ), n.flags |= 2, e.return = t, n.return = t, e.sibling = n, t.child = e, va(t, l.child, null, f), e = t.child, e.memoizedState = ic(f), e.childLanes = fc(
        l,
        a,
        f
      ), t.memoizedState = nc, Ye(null, e));
    if (xu(t), io(n)) {
      if (a = n.nextSibling && n.nextSibling.dataset, a) var c = a.dgst;
      return a = c, a !== "" && (e = Error(y(419)), e.stack = "", e.digest = a, Ae({ value: e, source: null, stack: null })), ui(
        l,
        t,
        f
      );
    }
    if (Yl || na(l, t, f, !1), a = (f & l.childLanes) !== 0, Yl || a) {
      if (ju.current !== null)
        return ui(
          l,
          t,
          f
        );
      if (a = bl, a !== null && (e = Bo(
        a,
        f
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, ta(l, e), ht(a, l, e), ac;
      return no(n) || Ti(), ui(
        l,
        t,
        f
      );
    }
    return no(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, Tl = Gt(n.nextSibling), Kl = t, J = !0, Du = null, qt = !1, l !== null && Bs(t, l), t = cc(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function tv(l, t, u) {
    l.lanes |= t;
    var a = l.alternate;
    a !== null && (a.lanes |= t), jn(l.return, t, u);
  }
  function uv(l) {
    for (var t = null; l !== null; ) {
      var u = l.alternate;
      u !== null && Vn(u) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function ai(l, t, u, a, e, n) {
    var i = l.memoizedState;
    i === null ? l.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: a,
      tail: u,
      tailMode: e,
      treeForkCount: n
    } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = a, i.tail = u, i.tailMode = e, i.treeForkCount = n);
  }
  function oc(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var u = t.sibling;
      t.sibling = l.child, l.child = t, t = u;
    }
  }
  function sc(l, t, u) {
    var a = t.pendingProps, e = a.revealOrder, n = a.tail;
    a = a.children;
    var i = kl.current;
    if (t.flags & 128)
      return je(t, i), null;
    var f = (i & 2) !== 0;
    if (f ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, je(t, i), e === "backwards" && l !== null ? (oc(l), Ql(l, t, a, u), oc(l)) : Ql(l, t, a, u), a = J ? Ne : 0, !f && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && tv(l, u, t);
        else if (l.tag === 19)
          tv(l, u, t);
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
        u = uv(t.child), u === null ? (e = t.child, t.child = null) : (e = u.sibling, u.sibling = null, oc(t)), ai(
          t,
          !0,
          e,
          null,
          n,
          a
        );
        break;
      case "unstable_legacy-backwards":
        for (u = null, e = t.child, t.child = null; e !== null; ) {
          if (l = e.alternate, l !== null && Vn(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = u, u = e, e = l;
        }
        ai(
          t,
          !0,
          u,
          null,
          n,
          a
        );
        break;
      case "together":
        ai(
          t,
          !1,
          null,
          null,
          void 0,
          a
        );
        break;
      case "independent":
        t.memoizedState = null;
        break;
      default:
        u = uv(t.child), u === null ? (e = t.child, t.child = null) : (e = u.sibling, u.sibling = null), ai(
          t,
          !1,
          e,
          u,
          n,
          a
        );
    }
    return t.child;
  }
  function av(l, t, u) {
    var a = t.pendingProps;
    return Uu(t, t.type, a.value), Ql(l, t, a.children, u), t.child;
  }
  function gu(l, t, u) {
    if (l !== null && (t.dependencies = l.dependencies), Xu |= t.lanes, (u & t.childLanes) === 0)
      if (l !== null) {
        if (na(
          l,
          t,
          u,
          !1
        ), (u & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(y(153));
    if (t.child !== null) {
      for (l = t.child, u = vu(l, l.pendingProps), t.child = u, u.return = t; l.sibling !== null; )
        l = l.sibling, u = u.sibling = vu(l, l.pendingProps), u.return = t;
      u.sibling = null;
    }
    return t.child;
  }
  function vc(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && xn(l)));
  }
  function qr(l, t, u) {
    switch (t.tag) {
      case 3:
        cn(t, t.stateNode.containerInfo), Uu(t, Bl, l.memoizedState.cache), aa();
        break;
      case 27:
      case 5:
        qi(t);
        break;
      case 4:
        cn(t, t.stateNode.containerInfo);
        break;
      case 10:
        Uu(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Bf(t), null;
        break;
      case 13:
        var a = t.memoizedState;
        if (a !== null) {
          if (a.dehydrated !== null)
            return xu(t), t.flags |= 128, null;
          a = na(
            l,
            t,
            u,
            !1
          );
          var e = t.child.childLanes;
          return a || (u & e) !== 0 ? lv(l, t, u) : (xu(t), l = gu(
            l,
            t,
            u
          ), l !== null ? l.sibling : null);
        }
        xu(t);
        break;
      case 19:
        if (t.flags & 128)
          return sc(
            l,
            t,
            u
          );
        if (e = (l.flags & 128) !== 0, a = (u & t.childLanes) !== 0, a || (na(
          l,
          t,
          u,
          !1
        ), a = (u & t.childLanes) !== 0), e) {
          if (a)
            return sc(
              l,
              t,
              u
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), je(t, kl.current), a) break;
        return null;
      case 22:
        return t.lanes = 0, $0(
          l,
          t,
          u,
          t.pendingProps
        );
      case 24:
        Uu(t, Bl, l.memoizedState.cache);
    }
    return gu(l, t, u);
  }
  function ev(l, t, u) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Yl = !0;
      else {
        if (!vc(l, u) && (t.flags & 128) === 0)
          return Yl = !1, qr(
            l,
            t,
            u
          );
        Yl = (l.flags & 131072) !== 0;
      }
    else
      Yl = !1, J && (t.flags & 1048576) !== 0 && xs(t, Ne, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var a = t.pendingProps;
          if (l = oa(t.elementType), t.type = l, typeof l == "function")
            Sf(l) ? (a = da(l, a), t.tag = 1, t = k0(
              null,
              t,
              l,
              a,
              u
            )) : (t.tag = 0, t = ec(
              null,
              t,
              l,
              a,
              u
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === N) {
                t.tag = 11, t = K0(
                  null,
                  t,
                  l,
                  a,
                  u
                );
                break l;
              } else if (e === ul) {
                t.tag = 14, t = J0(
                  null,
                  t,
                  l,
                  a,
                  u
                );
                break l;
              } else if (e === Dl) {
                t.tag = 10, t.type = l, t = av(
                  null,
                  t,
                  u
                );
                break l;
              }
            }
            throw t = ll(l) || l, Error(y(306, t, ""));
          }
        }
        return t;
      case 0:
        return ec(
          l,
          t,
          t.type,
          t.pendingProps,
          u
        );
      case 1:
        return a = t.type, e = da(
          a,
          t.pendingProps
        ), k0(
          l,
          t,
          a,
          e,
          u
        );
      case 3:
        l: {
          if (cn(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(y(387));
          a = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Rf(l, t), pe(t, a, null, u);
          var i = t.memoizedState;
          if (a = i.cache, Uu(t, Bl, a), a !== n.cache && Nf(
            t,
            [Bl],
            u,
            !0
          ), He(), a = i.element, n.isDehydrated)
            if (n = {
              element: a,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = P0(
                l,
                t,
                a,
                u
              );
              break l;
            } else if (a !== e) {
              e = jt(
                Error(y(424)),
                t
              ), Ae(e), t = P0(
                l,
                t,
                a,
                u
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, Tl = Gt(l.firstChild), Kl = t, J = !0, Du = null, qt = !0, u = $s(
                t,
                null,
                a,
                u
              ), t.child = u; u; )
                u.flags = u.flags & -3 | 134221824, u = u.sibling;
          else {
            if (aa(), a === e) {
              t = gu(
                l,
                t,
                u
              );
              break l;
            }
            Ql(l, t, a, u);
          }
          t = t.child;
        }
        return t;
      case 26:
        return Za(l, t), l === null ? (u = Um(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = u : J || (t.stateNode = cm(
          t.type,
          t.pendingProps,
          Eu.current,
          t
        )) : t.memoizedState = Um(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return qi(t), l === null && J && (a = t.stateNode = Nm(
          t.type,
          t.pendingProps,
          Eu.current
        ), Kl = t, qt = !0, e = Tl, Lu(t.type) ? (fo = e, Tl = Gt(a.firstChild)) : Tl = e), Ql(
          l,
          t,
          t.pendingProps.children,
          u
        ), Za(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && J && ((e = a = Tl) && (a = Ry(
          a,
          t.type,
          t.pendingProps,
          qt
        ), a !== null ? (t.stateNode = a, Kl = t, Tl = Gt(a.firstChild), qt = !1, e = !0) : e = !1), e || Mu(t)), qi(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, a = n.children, kc(e, n) ? a = null : i !== null && kc(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Gf(
          l,
          t,
          Ar,
          null,
          null,
          u
        ), ie._currentValue = e), Za(l, t), Ql(l, t, a, u), t.child;
      case 6:
        return l === null && J && ((l = u = Tl) && (u = Hy(
          u,
          t.pendingProps,
          qt
        ), u !== null ? (t.stateNode = u, Kl = t, Tl = null, l = !0) : l = !1), l || Mu(t)), null;
      case 13:
        return lv(l, t, u);
      case 4:
        return cn(
          t,
          t.stateNode.containerInfo
        ), a = t.pendingProps, l === null ? t.child = va(
          t,
          null,
          a,
          u
        ) : Ql(l, t, a, u), t.child;
      case 11:
        return K0(
          l,
          t,
          t.type,
          t.pendingProps,
          u
        );
      case 7:
        return a = t.pendingProps, Za(l, t), Ql(l, t, a, u), t.child;
      case 8:
        return Ql(
          l,
          t,
          t.pendingProps.children,
          u
        ), t.child;
      case 12:
        return Ql(
          l,
          t,
          t.pendingProps.children,
          u
        ), t.child;
      case 10:
        return av(l, t, u);
      case 9:
        return e = t.type._context, a = t.pendingProps.children, ia(t), e = Wl(e), a = a(e), t.flags |= 1, Ql(l, t, a, u), t.child;
      case 14:
        return J0(
          l,
          t,
          t.type,
          t.pendingProps,
          u
        );
      case 15:
        return w0(
          l,
          t,
          t.type,
          t.pendingProps,
          u
        );
      case 19:
        return sc(l, t, u);
      case 31:
        return xr(l, t, u);
      case 22:
        return $0(
          l,
          t,
          u,
          t.pendingProps
        );
      case 24:
        return ia(t), a = Wl(Bl), l === null ? (e = Mf(), e === null && (e = bl, n = Af(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= u), e = n), t.memoizedState = { parent: a, cache: e }, Cf(t), Uu(t, Bl, e)) : ((l.lanes & u) !== 0 && (Rf(l, t), pe(t, null, null, u), He()), e = l.memoizedState, n = t.memoizedState, e.parent !== a ? (e = { parent: a, cache: a }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), Uu(t, Bl, a)) : (a = n.cache, Uu(t, Bl, a), a !== e.cache && Nf(
          t,
          [Bl],
          u,
          !0
        ))), Ql(
          l,
          t,
          t.pendingProps.children,
          u
        ), t.child;
      case 30:
        return t.stateNode === null && (t.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), a = t.pendingProps, a.name != null && a.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : J && Hn(t), l !== null && l.memoizedProps.name !== a.name ? t.flags |= 4194816 : Za(l, t), Ql(l, t, a.children, u), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(y(156, t.tag));
  }
  function Su(l) {
    l.flags |= 4;
  }
  function mc(l, t, u, a, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = u === null ? pm(t, a) : pm(t, a) && (a.src !== u.src || a.srcSet !== u.srcSet)), n) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Gv()) l.flags |= 8192;
        else
          throw sa = Gn, Uf;
    } else l.flags &= -16777217;
  }
  function nv(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !jm(t))
      if (Gv()) l.flags |= 8192;
      else
        throw sa = Gn, Uf;
  }
  function ei(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? po() : 536870912, l.lanes |= t, wa |= t);
  }
  function Ge(l, t) {
    if (!J)
      switch (l.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var u = l.tail, a = null; u !== null; )
            u.alternate !== null && (a = u), u = u.sibling;
          a === null ? t || l.tail === null ? l.tail = null : l.tail.sibling = null : a.sibling = null;
          break;
        default:
          for (t = l.tail, u = null; t !== null; )
            t.alternate !== null && (u = t), t = t.sibling;
          u === null ? l.tail = null : u.sibling = null;
      }
  }
  function El(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, u = 0, a = 0;
    if (t)
      for (var e = l.child; e !== null; )
        u |= e.lanes | e.childLanes, a |= e.subtreeFlags & 1206910976, a |= e.flags & 1206910976, e.return = l, e = e.sibling;
    else
      for (e = l.child; e !== null; )
        u |= e.lanes | e.childLanes, a |= e.subtreeFlags, a |= e.flags, e.return = l, e = e.sibling;
    return l.subtreeFlags |= a, l.childLanes = u, t;
  }
  function Yr(l, t, u) {
    var a = t.pendingProps;
    switch (Ef(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return El(t), null;
      case 1:
        return El(t), null;
      case 3:
        return u = t.stateNode, a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), ru(Bl), ba(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (l === null || l.child === null) && (xa(t) ? Su(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, _f())), El(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Su(t), n !== null ? (El(t), nv(t, n)) : (El(t), mc(
          t,
          e,
          null,
          a,
          u
        ))) : n ? n !== l.memoizedState ? (Su(t), El(t), nv(t, n)) : (El(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== a && Su(t), El(t), mc(
          t,
          e,
          l,
          a,
          u
        )), null;
      case 27:
        if (on(t), u = Eu.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== a && Su(t);
        else {
          if (!a) {
            if (t.stateNode === null)
              throw Error(y(166));
            return El(t), t.subtreeFlags &= -33554433, null;
          }
          l = at.current, xa(t) ? qs(t) : (l = Nm(e, a, u), t.stateNode = l, Su(t));
        }
        return El(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (on(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== a && Su(t);
        else {
          if (!a) {
            if (t.stateNode === null)
              throw Error(y(166));
            return El(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = at.current, xa(t))
            qs(t);
          else {
            var i = We(
              Eu.current
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
                    n = typeof a.is == "string" ? i.createElement("select", {
                      is: a.is
                    }) : i.createElement("select"), a.multiple ? n.multiple = !0 : a.size && (n.size = a.size);
                    break;
                  default:
                    n = typeof a.is == "string" ? i.createElement(e, { is: a.is }) : i.createElement(e);
                }
            }
            n[Fl] = t, n[vt] = a;
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
            l: switch (lt(n, e, a), e) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                a = !!a.autoFocus;
                break l;
              case "img":
                a = !0;
                break l;
              default:
                a = !1;
            }
            a && Su(t);
          }
        }
        return El(t), t.subtreeFlags &= -33554433, mc(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          u
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== a && Su(t);
        else {
          if (typeof a != "string" && t.stateNode === null)
            throw Error(y(166));
          if (l = Eu.current, xa(t)) {
            if (l = t.stateNode, u = t.memoizedProps, a = null, e = Kl, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  a = e.memoizedProps;
              }
            l[Fl] = t, l = !!(l.nodeValue === u || a !== null && a.suppressHydrationWarning === !0 || em(l.nodeValue, u)), l || Mu(t, !0);
          } else
            l = We(l).createTextNode(
              a
            ), l[Fl] = t, t.stateNode = l;
        }
        return El(t), null;
      case 31:
        if (u = t.memoizedState, l === null || l.memoizedState !== null) {
          if (a = xa(t), u !== null) {
            if (l === null) {
              if (!a) throw Error(y(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(557));
              l[Fl] = t;
            } else
              aa(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            El(t), l = !1;
          } else
            u = _f(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = u), l = !0;
          if (!l)
            return t.flags & 256 ? (_t(t), t) : (_t(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(y(558));
        }
        return El(t), null;
      case 13:
        if (a = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = xa(t), a !== null && a.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(y(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(y(317));
              e[Fl] = t;
            } else
              aa(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            El(t), e = !1;
          } else
            e = _f(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (_t(t), t) : (_t(t), null);
        }
        return _t(t), (t.flags & 128) !== 0 ? (t.lanes = u, t) : (u = a !== null, l = l !== null && l.memoizedState !== null, u && (a = t.child, e = null, a.alternate !== null && a.alternate.memoizedState !== null && a.alternate.memoizedState.cachePool !== null && (e = a.alternate.memoizedState.cachePool.pool), n = null, a.memoizedState !== null && a.memoizedState.cachePool !== null && (n = a.memoizedState.cachePool.pool), n !== e && (a.flags |= 2048)), u !== l && u && (t.child.flags |= 8192), ei(t, t.updateQueue), El(t), null);
      case 4:
        return ba(), l === null && wc(t.stateNode.containerInfo), t.flags |= 67108864, El(t), null;
      case 10:
        return ru(t.type), El(t), null;
      case 19:
        if (qf(t), a = t.memoizedState, a === null) return El(t), null;
        if (e = (t.flags & 128) !== 0, n = a.rendering, n === null)
          if (e) Ge(a, !1);
          else {
            if (Rl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Vn(l), n !== null) {
                  for (t.flags |= 128, Ge(a, !1), l = n.updateQueue, t.updateQueue = l, ei(t, l), t.subtreeFlags = 0, l = u, u = t.child; u !== null; )
                    Hs(u, l), u = u.sibling;
                  return je(
                    t,
                    kl.current & 1 | 2
                  ), J && mu(t, a.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            a.tail !== null && St() > hi && (t.flags |= 128, e = !0, Ge(a, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = Vn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, ei(t, l), Ge(a, !0), a.tail === null && a.tailMode !== "collapsed" && a.tailMode !== "visible" && !n.alternate && !J)
                return El(t), null;
            } else
              2 * St() - a.renderingStartTime > hi && u !== 536870912 && (t.flags |= 128, e = !0, Ge(a, !1), t.lanes = 4194304);
          a.isBackwards ? (n.sibling = t.child, t.child = n) : (l = a.last, l !== null ? l.sibling = n : t.child = n, a.last = n);
        }
        if (a.tail !== null) {
          l = a.tail;
          l: {
            for (u = l; u !== null; ) {
              if (u.alternate !== null) {
                u = !1;
                break l;
              }
              u = u.sibling;
            }
            u = !0;
          }
          return a.rendering = l, a.tail = l.sibling, a.renderingStartTime = St(), l.sibling = null, n = kl.current, n = e ? n & 1 | 2 : n & 1, a.tailMode === "visible" || a.tailMode === "collapsed" || !u || J ? je(t, n) : (u = n, W(Il, t), W(kl, u), et === null && (et = t)), J && mu(t, a.treeForkCount), l;
        }
        return El(t), null;
      case 22:
      case 23:
        return _t(t), xf(), a = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== a && (t.flags |= 8192) : a && (t.flags |= 8192), a ? (u & 536870912) !== 0 && (t.flags & 128) === 0 && (El(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : El(t), u = t.updateQueue, u !== null && ei(t, u.retryQueue), u = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (u = l.memoizedState.cachePool.pool), a = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (a = t.memoizedState.cachePool.pool), a !== u && (t.flags |= 2048), l !== null && Z(ca), null;
      case 24:
        return u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), ru(Bl), El(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, El(t), null;
    }
    throw Error(y(156, t.tag));
  }
  function Gr(l, t) {
    switch (Ef(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return ru(Bl), ba(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return on(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (_t(t), t.alternate === null)
            throw Error(y(340));
          aa();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (_t(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(y(340));
          aa();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return qf(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return ba(), null;
      case 10:
        return ru(t.type), null;
      case 22:
      case 23:
        return _t(t), xf(), l !== null && Z(ca), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return ru(Bl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function iv(l, t) {
    switch (Ef(t), t.tag) {
      case 3:
        ru(Bl), ba();
        break;
      case 26:
      case 27:
      case 5:
        on(t);
        break;
      case 4:
        ba();
        break;
      case 31:
        t.memoizedState !== null && _t(t);
        break;
      case 13:
        _t(t);
        break;
      case 19:
        qf(t);
        break;
      case 10:
        ru(t.type);
        break;
      case 22:
      case 23:
        _t(t), xf(), l !== null && Z(ca);
        break;
      case 24:
        ru(Bl);
    }
  }
  function Xe(l, t) {
    try {
      var u = t.updateQueue, a = u !== null ? u.lastEffect : null;
      if (a !== null) {
        var e = a.next;
        u = e;
        do {
          if ((u.tag & l) === l) {
            a = void 0;
            var n = u.create, i = u.inst;
            a = n(), i.destroy = a;
          }
          u = u.next;
        } while (u !== e);
      }
    } catch (f) {
      dl(t, t.return, f);
    }
  }
  function qu(l, t, u) {
    try {
      var a = t.updateQueue, e = a !== null ? a.lastEffect : null;
      if (e !== null) {
        var n = e.next;
        a = n;
        do {
          if ((a.tag & l) === l) {
            var i = a.inst, f = i.destroy;
            if (f !== void 0) {
              i.destroy = void 0, e = t;
              var c = u, d = f;
              try {
                d();
              } catch (g) {
                dl(
                  e,
                  c,
                  g
                );
              }
            }
          }
          a = a.next;
        } while (a !== n);
      }
    } catch (g) {
      dl(t, t.return, g);
    }
  }
  function fv(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var u = l.stateNode;
      try {
        Ws(t, u);
      } catch (a) {
        dl(l, l.return, a);
      }
    }
  }
  function cv(l, t, u) {
    u.props = da(
      l.type,
      l.memoizedProps
    ), u.state = l.memoizedState;
    try {
      u.componentWillUnmount();
    } catch (a) {
      dl(l, t, a);
    }
  }
  function kt(l, t) {
    try {
      var u = l.ref;
      if (u !== null) {
        switch (l.tag) {
          case 26:
          case 27:
          case 5:
            var a = l.stateNode;
            break;
          case 30:
            var e = l.stateNode, n = ou(l.memoizedProps, e);
            (e.ref === null || e.ref.name !== n) && (e.ref = ym(n)), a = e.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new Mt(l);
              S(
                l.child,
                !1,
                Uy,
                i,
                void 0,
                void 0
              ), l.stateNode = i;
            }
            a = l.stateNode;
            break;
          default:
            a = l.stateNode;
        }
        typeof u == "function" ? l.refCleanup = u(a) : u.current = a;
      }
    } catch (f) {
      dl(l, t, f);
    }
  }
  function Pl(l, t) {
    var u = l.ref, a = l.refCleanup;
    if (u !== null)
      if (typeof a == "function")
        try {
          a();
        } catch (e) {
          dl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof u == "function")
        try {
          u(null);
        } catch (e) {
          dl(l, t, e);
        }
      else u.current = null;
  }
  function ni(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var u = 0; u < t.length; u++)
        Em(
          l.stateNode,
          t[u]
        );
  }
  function ov(l) {
    for (var t = l.return; t !== null && (rc(t) && Em(l.stateNode, t.stateNode), !dc(t)); )
      t = t.return;
  }
  function Qe(l) {
    for (var t = l.return; t !== null && (rc(t) && Cy(l.stateNode, t.stateNode), !dc(t)); )
      t = t.return;
  }
  function dc(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function rc(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function yc(l) {
    var t = l.type, u = l.memoizedProps, a = l.stateNode;
    try {
      l: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          u.autoFocus && a.focus();
          break l;
        case "img":
          u.src ? a.src = u.src : u.srcSet && (a.srcset = u.srcSet);
      }
    } catch (e) {
      dl(l, l.return, e);
    }
  }
  function hc(l, t, u) {
    try {
      var a = l.stateNode;
      vy(a, l.type, u, t), a[vt] = t;
    } catch (e) {
      dl(l, l.return, e);
    }
  }
  function sv(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Lu(l.type) || l.tag === 4;
  }
  function gc(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || sv(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Lu(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Sc(l, t, u, a) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? (u.nodeType === 9 ? u.body : u.nodeName === "HTML" ? u.ownerDocument.body : u).insertBefore(e, t) : (t = u.nodeType === 9 ? u.body : u.nodeName === "HTML" ? u.ownerDocument.body : u, t.appendChild(e), u = u._reactRootContainer, u != null || t.onclick !== null || (t.onclick = Ft)), ni(l, a), ol = !0;
    else if (e !== 4 && (e === 27 && (ni(l, a), a = null, Lu(l.type) && (u = l.stateNode, t = null)), l = l.child, l !== null))
      for (Sc(
        l,
        t,
        u,
        a
      ), l = l.sibling; l !== null; )
        Sc(
          l,
          t,
          u,
          a
        ), l = l.sibling;
  }
  function ii(l, t, u, a) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? u.insertBefore(e, t) : u.appendChild(e), ni(l, a), ol = !0;
    else if (e !== 4 && (e === 27 && (ni(l, a), a = null, Lu(l.type) && (u = l.stateNode)), l = l.child, l !== null))
      for (ii(
        l,
        t,
        u,
        a
      ), l = l.sibling; l !== null; )
        ii(
          l,
          t,
          u,
          a
        ), l = l.sibling;
  }
  function vv(l) {
    var t = l.stateNode, u = l.memoizedProps;
    try {
      for (var a = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      lt(t, a, u), t[Fl] = l, t[vt] = u;
    } catch (n) {
      dl(l, l.return, n);
    }
  }
  var fi = !1, Ot = null;
  function mv(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (fi = !0);
  }
  var Pt = null;
  function dv() {
    var l = Pt;
    return Pt = null, l;
  }
  var dt = 0;
  function Va(l, t, u, a, e) {
    return dt = 0, rv(
      l.child,
      t,
      u,
      a,
      e
    );
  }
  function rv(l, t, u, a, e) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (a !== null) {
          var f = to(i);
          a.push(f), f.view && (n = !0);
        } else
          n || to(i).view && (n = !0);
        fi = !0, dm(
          i,
          dt === 0 ? t : t + "_" + dt,
          u
        ), dt++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && e || rv(
        l.child,
        t,
        u,
        a,
        e
      ) && (n = !0));
      l = l.sibling;
    }
    return n;
  }
  function lu(l, t) {
    for (; l !== null; )
      l.tag === 5 ? rm(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || lu(
        l.child,
        t
      )), l = l.sibling;
  }
  function ci(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if ((l.tag !== 22 || l.memoizedState === null) && (ci(l), l.tag === 30 && (l.flags & 18874368) !== 0 && l.stateNode.paired)) {
          var t = l.memoizedProps;
          if (t.name == null || t.name === "auto")
            throw Error(y(544));
          var u = t.name;
          t = su(t.default, t.share), t !== "none" && (Va(
            l,
            u,
            t,
            null,
            !1
          ) || lu(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function bc(l, t) {
    if (l.tag === 30) {
      var u = l.stateNode, a = l.memoizedProps, e = ou(a, u), n = su(
        a.default,
        u.paired ? a.share : a.enter
      );
      n !== "none" ? Va(l, e, n, null, !1) ? (ci(l), u.paired || t || Ia(l, a.onEnter)) : lu(l.child, !1) : ci(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        bc(l, t), l = l.sibling;
    else ci(l);
  }
  function Tc(l) {
    if (Ot !== null && Ot.size !== 0) {
      var t = Ot;
      if ((l.subtreeFlags & 18874368) !== 0)
        for (l = l.child; l !== null; ) {
          if (l.tag !== 22 || l.memoizedState === null) {
            if (l.tag === 30 && (l.flags & 18874368) !== 0) {
              var u = l.memoizedProps, a = u.name;
              if (a != null && a !== "auto") {
                var e = t.get(a);
                if (e !== void 0) {
                  var n = su(
                    u.default,
                    u.share
                  );
                  if (n !== "none" && (Va(
                    l,
                    a,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, e.paired = n, n.paired = e, Ia(l, u.onShare)) : lu(l.child, !1)), t.delete(a), t.size === 0) break;
                }
              }
            }
            Tc(l);
          }
          l = l.sibling;
        }
    }
  }
  function Ec(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, u = ou(t, l.stateNode), a = Ot !== null ? Ot.get(u) : void 0, e = su(
        t.default,
        a !== void 0 ? t.share : t.exit
      );
      e !== "none" && (Va(l, u, e, null, !1) ? a !== void 0 ? (e = l.stateNode, a.paired = e, e.paired = a, Ot.delete(u), Ia(l, t.onShare)) : Ia(l, t.onExit) : lu(l.child, !1)), Ot !== null && Tc(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Ec(l), l = l.sibling;
    else
      Ot !== null && Tc(l);
  }
  function yv(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, u = ou(t, l.stateNode);
        t = su(t.default, t.update), l.flags &= -5, t !== "none" && Va(
          l,
          u,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && yv(l);
      l = l.sibling;
    }
  }
  function zc(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, lu(l.child, !1));
          }
          zc(l);
        }
        l = l.sibling;
      }
  }
  function oi(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, lu(l.child, !1), zc(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        oi(l), l = l.sibling;
    else zc(l);
  }
  function hv(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? lu(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && hv(l), l = l.sibling;
  }
  function _c(l, t, u, a, e, n, i) {
    for (var f = !1; t !== null; ) {
      if (t.tag === 5) {
        var c = t.stateNode;
        if (n !== null && dt < n.length) {
          var d = n[dt], g = to(c);
          (d.view || g.view) && (f = !0);
          var T;
          if (T = (l.flags & 4) === 0)
            if (g.clip) T = !0;
            else {
              T = d.rect;
              var v = g.rect;
              T = T.y !== v.y || T.x !== v.x || T.height !== v.height || T.width !== v.width;
            }
          T && (l.flags |= 4), g.abs ? g = !d.abs : (d = d.rect, g = g.rect, g = d.height !== g.height || d.width !== g.width), g && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && dm(
          c,
          dt === 0 ? u : u + "_" + dt,
          e
        ), f && (l.flags & 4) !== 0 || (Pt === null && (Pt = []), Pt.push(
          c,
          dt === 0 ? a : a + "_" + dt,
          t.memoizedProps
        )), dt++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : _c(
        l,
        t.child,
        u,
        a,
        e,
        n,
        i
      ) && (f = !0));
      t = t.sibling;
    }
    return f;
  }
  function gv(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var u = l.memoizedProps, a = l.stateNode, e = ou(u, a), n = su(u.default, u.update), i;
        i = l.memoizedState, l.memoizedState = null, a = l;
        var f = l.child;
        dt = 0, e = _c(
          a,
          f,
          e,
          e,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && e && Ia(l, u.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && gv(l);
      l = l.sibling;
    }
  }
  var Jl = !1, vl = !1, tu = !1, Oc = !1, Sv = typeof WeakSet == "function" ? WeakSet : Set, wl = null, uu = !1, Ze = !1, si = !1, Nc = !1;
  function Xr(l, t, u) {
    if (l = l.containerInfo, Wc = fe, l = zs(l), vf(l)) {
      if ("selectionStart" in l)
        var a = {
          start: l.selectionStart,
          end: l.selectionEnd
        };
      else
        l: {
          a = (a = l.ownerDocument) && a.defaultView || window;
          var e = a.getSelection && a.getSelection();
          if (e && e.rangeCount !== 0) {
            a = e.anchorNode;
            var n = e.anchorOffset, i = e.focusNode;
            e = e.focusOffset;
            try {
              a.nodeType, i.nodeType;
            } catch {
              a = null;
              break l;
            }
            var f = 0, c = -1, d = -1, g = 0, T = 0, v = l, h = null;
            t: for (; ; ) {
              for (var O; v !== a || n !== 0 && v.nodeType !== 3 || (c = f + n), v !== i || e !== 0 && v.nodeType !== 3 || (d = f + e), v.nodeType === 3 && (f += v.nodeValue.length), (O = v.firstChild) !== null; )
                h = v, v = O;
              for (; ; ) {
                if (v === l) break t;
                if (h === a && ++g === n && (c = f), h === i && ++T === e && (d = f), (O = v.nextSibling) !== null) break;
                v = h, h = v.parentNode;
              }
              v = O;
            }
            a = c === -1 || d === -1 ? null : { start: c, end: d };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (Ic = { focusedElem: l, selectionRange: a }, fe = !1, u = (u & 335544064) === u, wl = t, t = u ? 9270 : 1024; wl !== null; ) {
      if (l = wl, u && (a = l.deletions, a !== null))
        for (n = 0; n < a.length; n++)
          u && Ec(a[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        u && mv(l), vi(u);
      else {
        if (l.tag === 22) {
          if (a = l.alternate, l.memoizedState !== null) {
            a !== null && a.memoizedState === null && u && Ec(a), vi(u);
            continue;
          } else if (a !== null && a.memoizedState !== null) {
            u && mv(l), vi(u);
            continue;
          }
        }
        a = l.child, (l.subtreeFlags & t) !== 0 && a !== null ? (a.return = l, wl = a) : (u && yv(l), vi(u));
      }
    }
    Ot = null;
  }
  function vi(l) {
    for (; wl !== null; ) {
      var t = wl, u = l, a = t.alternate, e = t.flags;
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((e & 1024) !== 0 && a !== null) {
            u = void 0, e = a.memoizedProps, a = a.memoizedState;
            var n = t.stateNode;
            try {
              var i = da(
                t.type,
                e
              );
              u = n.getSnapshotBeforeUpdate(
                i,
                a
              ), n.__reactInternalSnapshotBeforeUpdate = u;
            } catch (f) {
              dl(t, t.return, f);
            }
          }
          break;
        case 3:
          if ((e & 1024) !== 0) {
            if (a = t.stateNode.containerInfo, u = a.nodeType, u === 9)
              eo(a);
            else if (u === 1)
              switch (a.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  eo(a);
                  break;
                default:
                  a.textContent = "";
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
          u && a !== null && (u = ou(
            a.memoizedProps,
            a.stateNode
          ), e = t.memoizedProps, e = su(e.default, e.update), e !== "none" && Va(
            a,
            u,
            e,
            a.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((e & 1024) !== 0) throw Error(y(163));
      }
      if (a = t.sibling, a !== null) {
        a.return = t.return, wl = a;
        break;
      }
      wl = t.return;
    }
  }
  function bv(l, t, u) {
    var a = u.flags;
    switch (u.tag) {
      case 0:
      case 11:
      case 15:
        au(l, u), a & 4 && Xe(5, u);
        break;
      case 1:
        if (au(l, u), a & 4)
          if (l = u.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              dl(u, u.return, i);
            }
          else {
            var e = da(
              u.type,
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
              dl(
                u,
                u.return,
                i
              );
            }
          }
        a & 64 && fv(u), a & 512 && kt(u, u.return);
        break;
      case 3:
        if (au(l, u), a & 64 && (l = u.updateQueue, l !== null)) {
          if (t = null, u.child !== null)
            switch (u.child.tag) {
              case 27:
              case 5:
                t = u.child.stateNode;
                break;
              case 1:
                t = u.child.stateNode;
            }
          try {
            Ws(l, t);
          } catch (i) {
            dl(u, u.return, i);
          }
        }
        break;
      case 27:
        t === null && a & 4 && vv(u);
      case 26:
      case 5:
        au(l, u), t === null && a & 4 && yc(u), a & 512 && kt(u, u.return);
        break;
      case 12:
        au(l, u);
        break;
      case 31:
        au(l, u), a & 4 && _v(l, u);
        break;
      case 13:
        au(l, u), a & 4 && Ov(l, u), a & 64 && (l = u.memoizedState, l !== null && (l = l.dehydrated, l !== null && (u = kr.bind(
          null,
          u
        ), py(l, u))));
        break;
      case 22:
        if (a = u.memoizedState !== null || Jl, !a) {
          var n = t !== null && t.memoizedState !== null || vl;
          t = Jl, e = vl, Jl = a, (vl = n) && !e ? (a = 2, (u.subtreeFlags & 8772) !== 0 && (a |= 1), Lt(
            l,
            u,
            a
          )) : au(l, u), Jl = t, vl = e;
        }
        break;
      case 30:
        au(l, u), a & 512 && kt(u, u.return);
        break;
      case 7:
        a & 512 && kt(u, u.return);
      default:
        au(l, u);
    }
  }
  function Ac(l, t) {
    for (l = l.child; l !== null; )
      Tv(l, t), l = l.sibling;
  }
  function Tv(l, t) {
    switch (l.tag) {
      case 5:
      case 26:
        try {
          var u = l.stateNode;
          if (t) {
            var a = u.style;
            typeof a.setProperty == "function" ? a.setProperty("display", "none", "important") : a.display = "none";
          } else {
            var e = l.stateNode, n = l.memoizedProps.style, i = n != null && n.hasOwnProperty("display") ? n.display : null;
            e.style.display = i == null || typeof i == "boolean" ? "" : ("" + i).trim();
          }
        } catch (c) {
          dl(l, l.return, c);
        }
        Dc(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, ol = !0;
        } catch (c) {
          dl(l, l.return, c);
        }
        break;
      case 18:
        try {
          var f = l.stateNode;
          t ? mm(f, !0) : mm(l.stateNode, !1);
        } catch (c) {
          dl(l, l.return, c);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && Ac(l, t);
        break;
      default:
        Ac(l, t);
    }
  }
  function Dc(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var u = l, a = t;
          switch (u.tag) {
            case 4:
              Tv(u, a);
              break l;
            case 22:
              u.memoizedState === null && Dc(u, a);
              break l;
            default:
              Dc(u, a);
          }
        }
        l = l.sibling;
      }
  }
  function Ev(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, Ev(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && hn(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Al = null, rt = !1;
  function Zt(l, t, u) {
    for (u = u.child; u !== null; )
      zv(l, t, u), u = u.sibling;
  }
  function zv(l, t, u) {
    if (bt && typeof bt.onCommitFiberUnmount == "function")
      try {
        bt.onCommitFiberUnmount(ve, u);
      } catch {
      }
    switch (u.tag) {
      case 26:
        vl || Pl(u, t), Zt(
          l,
          t,
          u
        ), u.memoizedState ? u.memoizedState.count-- : u.stateNode && !vl && (u = u.stateNode, u.parentNode.removeChild(u));
        break;
      case 27:
        vl || Pl(u, t), Qe(u);
        var a = Al, e = rt;
        Lu(u.type) && (Al = u.stateNode, rt = !1), Zt(
          l,
          t,
          u
        ), Am(
          u.stateNode,
          u.type,
          u.memoizedProps
        ), Al = a, rt = e;
        break;
      case 5:
        vl || Pl(u, t), Qe(u);
      case 6:
        if (u.tag === 6 && Qe(u), a = Al, e = rt, Al = null, Zt(
          l,
          t,
          u
        ), Al = a, rt = e, Al !== null)
          if (rt)
            try {
              (Al.nodeType === 9 ? Al.body : Al.nodeName === "HTML" ? Al.ownerDocument.body : Al).removeChild(u.stateNode), ol = !0;
            } catch (n) {
              dl(
                u,
                t,
                n
              );
            }
          else
            try {
              Al.removeChild(u.stateNode), ol = !0;
            } catch (n) {
              dl(
                u,
                t,
                n
              );
            }
        break;
      case 18:
        Al !== null && (rt ? (l = Al, vm(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          u.stateNode
        ), ce(l)) : vm(Al, u.stateNode));
        break;
      case 4:
        a = Al, e = rt, Al = u.stateNode.containerInfo, rt = !0, Zt(
          l,
          t,
          u
        ), Al = a, rt = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        qu(2, u, t), vl || qu(4, u, t), Zt(
          l,
          t,
          u
        );
        break;
      case 1:
        vl || (Pl(u, t), a = u.stateNode, typeof a.componentWillUnmount == "function" && cv(
          u,
          t,
          a
        )), Zt(
          l,
          t,
          u
        );
        break;
      case 21:
        Zt(
          l,
          t,
          u
        );
        break;
      case 22:
        vl = (a = vl) || u.memoizedState !== null, Zt(
          l,
          t,
          u
        ), vl = a;
        break;
      case 30:
        Pl(u, t), Zt(
          l,
          t,
          u
        );
        break;
      case 7:
        vl || Pl(u, t), Zt(
          l,
          t,
          u
        );
        break;
      default:
        Zt(
          l,
          t,
          u
        );
    }
  }
  function _v(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        ce(l);
      } catch (u) {
        dl(t, t.return, u);
      }
    }
  }
  function Ov(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        ce(l);
      } catch (u) {
        dl(t, t.return, u);
      }
  }
  function Qr(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new Sv()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new Sv()), t;
      default:
        throw Error(y(435, l.tag));
    }
  }
  function mi(l, t) {
    var u = Qr(l);
    t.forEach(function(a) {
      if (!u.has(a)) {
        u.add(a);
        var e = Pr.bind(null, l, a);
        a.then(e, e);
      }
    });
  }
  function ct(l, t, u) {
    var a = t.deletions;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var n = a[e], i = l, f = t, c = f;
        l: for (; c !== null; ) {
          switch (c.tag) {
            case 27:
              if (Lu(c.type)) {
                Al = c.stateNode, rt = !1;
                break l;
              }
              break;
            case 5:
              Al = c.stateNode, rt = !1;
              break l;
            case 3:
            case 4:
              Al = c.stateNode.containerInfo, rt = !0;
              break l;
          }
          c = c.return;
        }
        if (Al === null) throw Error(y(160));
        zv(i, f, n), Al = null, rt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Nv(t, l, u), t = t.sibling;
  }
  var Vt = null;
  function Nv(l, t, u) {
    var a = l.alternate, e = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (e & 4 && (a = l.updateQueue, a = a !== null ? a.events : null, a !== null))
          for (var n = 0; n < a.length; n++) {
            var i = a[n];
            i.ref.impl = i.nextImpl;
          }
        ct(t, l, u), ot(l), e & 4 && (qu(3, l, l.return), Xe(3, l), qu(5, l, l.return));
        break;
      case 1:
        ct(t, l, u), ot(l), e & 512 && (vl || a === null || Pl(a, a.return)), e & 64 && Jl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (u = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = u === null ? t : u.concat(t))));
        break;
      case 26:
        if (n = Vt, ct(t, l, u), ot(l), e & 512 && (vl || a === null || Pl(a, a.return)), e & 4)
          if (e = a !== null ? a.memoizedState : null, u = l.memoizedState, a === null)
            if (u === null)
              if (l.stateNode === null)
                if (Jl)
                  l.stateNode = cm(
                    l.type,
                    l.memoizedProps,
                    t.containerInfo,
                    l
                  );
                else {
                  l: {
                    t = l.type, u = l.memoizedProps, e = n.ownerDocument || n;
                    t: switch (t) {
                      case "title":
                        a = e.getElementsByTagName("title")[0], (!a || a[re] || a[Fl] || a.namespaceURI === "http://www.w3.org/2000/svg" || a.hasAttribute("itemprop")) && (a = e.createElement(t), e.head.insertBefore(
                          a,
                          e.querySelector("head > title")
                        )), lt(a, t, u), a[Fl] = l, Ll(a), t = a;
                        break l;
                      case "link":
                        if (n = Hm(
                          "link",
                          "href",
                          e
                        ).get(t + (u.href || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (a = n[i], a.getAttribute("href") === (u.href == null || u.href === "" ? null : u.href) && a.getAttribute("rel") === (u.rel == null ? null : u.rel) && a.getAttribute("title") === (u.title == null ? null : u.title) && a.getAttribute("crossorigin") === (u.crossOrigin == null ? null : u.crossOrigin)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        a = e.createElement(t), lt(a, t, u), e.head.appendChild(a);
                        break;
                      case "meta":
                        if (n = Hm(
                          "meta",
                          "content",
                          e
                        ).get(t + (u.content || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (a = n[i], a.getAttribute("content") === (u.content == null ? null : "" + u.content) && a.getAttribute("name") === (u.name == null ? null : u.name) && a.getAttribute("property") === (u.property == null ? null : u.property) && a.getAttribute("http-equiv") === (u.httpEquiv == null ? null : u.httpEquiv) && a.getAttribute("charset") === (u.charSet == null ? null : u.charSet)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        a = e.createElement(t), lt(a, t, u), e.head.appendChild(a);
                        break;
                      default:
                        throw Error(y(468, t));
                    }
                    a[Fl] = l, Ll(a), t = a;
                  }
                  l.stateNode = t;
                }
              else
                Jl || vo(n, l.type, l.stateNode);
            else
              l.stateNode = Rm(
                n,
                u,
                l.memoizedProps
              );
          else
            e !== u ? (e === null ? (t = a.stateNode, t === null || vl || t.parentNode.removeChild(t)) : e.count--, u === null ? Jl || vo(n, l.type, l.stateNode) : Rm(n, u, l.memoizedProps)) : u === null && l.stateNode !== null && hc(
              l,
              l.memoizedProps,
              a.memoizedProps
            );
        break;
      case 27:
        ct(t, l, u), ot(l), e & 512 && (vl || a === null || Pl(a, a.return)), a !== null && e & 4 && hc(
          l,
          l.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (n = tu, tu = !1, ct(t, l, u), tu = n, ot(l), e & 512 && (vl || a === null || Pl(a, a.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Na(t, ""), ol = !0;
          } catch (g) {
            dl(l, l.return, g);
          }
        }
        e & 4 && l.stateNode != null && (t = l.memoizedProps, hc(
          l,
          t,
          a !== null ? a.memoizedProps : t
        )), e & 1024 && (Oc = !0);
        break;
      case 6:
        if (ct(t, l, u), ot(l), e & 4) {
          if (l.stateNode === null)
            throw Error(y(162));
          t = l.memoizedProps, u = l.stateNode;
          try {
            u.nodeValue = t, ol = !0;
          } catch (g) {
            dl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (ol = !1, Di = null, n = Vt, Vt = Ie(t.containerInfo), ct(t, l, u), Vt = n, ot(l), e & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            ce(t.containerInfo);
          } catch (g) {
            dl(l, l.return, g);
          }
        Oc && (Oc = !1, Av(l)), ol = !1;
        break;
      case 4:
        e = tu, tu = Jl, a = Jo(), n = Vt, Vt = Ie(
          l.stateNode.containerInfo
        ), ct(t, l, u), ot(l), Vt = n, ol && Ze && (si = !0), ol = a, tu = e;
        break;
      case 12:
        ct(t, l, u), ot(l);
        break;
      case 31:
        ct(t, l, u), ot(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 13:
        ct(t, l, u), ot(l), l.child.flags & 8192 && l.memoizedState !== null != (a !== null && a.memoizedState !== null) && (yi = St()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = a !== null && a.memoizedState !== null;
        var f = Jl, c = vl, d = tu;
        Jl = f || n, tu = d || n, vl = c || i, ct(t, l, u), vl = c, tu = d, Jl = f, ot(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || a === null || i || Jl || vl || (t = i || vl, u = Jl, a = vl, Jl = n || Jl, vl = t, Yu(l, 2), Jl = u, vl = a), !n && tu || Ac(l, n)), e & 4 && (t = l.updateQueue, t !== null && (u = t.retryQueue, u !== null && (t.retryQueue = null, mi(l, u))));
        break;
      case 19:
        ct(t, l, u), ot(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 30:
        e & 512 && (vl || a === null || Pl(a, a.return)), e = Jo(), n = Ze, i = (u & 335544064) === u, f = l.memoizedProps, Ze = i && su(
          f.default,
          f.update
        ) !== "none", ct(t, l, u), ot(l), i && a !== null && ol && (l.flags |= 4), Ze = n, ol = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (vl || a === null || Pl(a, a.return)), a && a.stateNode !== null && (a.stateNode._fragmentFiber = l);
      default:
        ct(t, l, u), ot(l);
    }
  }
  function ot(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var u, a = l.return; a !== null; ) {
          if (sv(a)) {
            u = a;
            break;
          }
          a = a.return;
        }
        a = null;
        for (var e = l.return; e !== null; ) {
          if (rc(e)) {
            var n = e.stateNode;
            a === null ? a = [n] : a.push(n);
          }
          if (dc(e)) break;
          e = e.return;
        }
        var i = a;
        if (u == null) throw Error(y(160));
        switch (u.tag) {
          case 27:
            var f = u.stateNode, c = gc(l);
            ii(
              l,
              c,
              f,
              i
            );
            break;
          case 5:
            var d = u.stateNode;
            u.flags & 32 && (Na(d, ""), u.flags &= -33);
            var g = gc(l);
            ii(
              l,
              g,
              d,
              i
            );
            break;
          case 3:
          case 4:
            var T = u.stateNode.containerInfo, v = gc(l);
            Sc(
              l,
              v,
              T,
              i
            );
            break;
          default:
            throw Error(y(161));
        }
      } catch (h) {
        dl(l, l.return, h);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function Av(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        Av(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, fe = !0, t.reset(), fe = !1), l = l.sibling;
      }
  }
  function La(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Dv(t, l), t = t.sibling;
    else gv(t);
  }
  function Dv(l, t) {
    var u = l.alternate;
    if (u === null) bc(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Nc = uu = !1, dv(), La(t, l), !uu && !si) {
            if (l = Pt, l !== null)
              for (var a = 0; a < l.length; a += 3) {
                u = l[a];
                var e = l[a + 1];
                rm(u, l[a + 2]), u = u.ownerDocument.documentElement, u !== null && u.animate(
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
            )), Nc = !0;
          }
          Pt = null;
          break;
        case 5:
          La(t, l);
          break;
        case 4:
          a = uu, uu = !1, La(t, l), uu && (si = !0), uu = a;
          break;
        case 22:
          l.memoizedState === null && (u.memoizedState !== null ? bc(l, !1) : La(t, l));
          break;
        case 30:
          a = uu, e = dv(), uu = !1, La(t, l), uu && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = ou(n, i), i = ou(u.memoizedProps, i);
          var f = su(n.default, n.update);
          f === "none" ? t = !1 : (n = u.memoizedState, u.memoizedState = null, u = l.child, dt = 0, t = _c(
            l,
            u,
            t,
            i,
            f,
            n,
            !0
          ), dt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (Ia(
            l,
            l.memoizedProps.onUpdate
          ), Pt = e) : e !== null && (e.push.apply(e, Pt), Pt = e), uu = (l.flags & 32) !== 0 ? !0 : a;
          break;
        default:
          La(t, l);
      }
  }
  function au(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        bv(l, t.alternate, t), t = t.sibling;
  }
  function Yu(l, t) {
    for (l = l.child; l !== null; ) {
      var u = l, a = t;
      switch (u.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          qu(4, u, u.return), Yu(
            u,
            a
          );
          break;
        case 1:
          Pl(u, u.return);
          var e = u.stateNode;
          typeof e.componentWillUnmount == "function" && cv(
            u,
            u.return,
            e
          ), Yu(
            u,
            a
          );
          break;
        case 27:
          (a & 2) !== 0 && Am(
            u.stateNode,
            u.type,
            u.memoizedProps
          );
        case 5:
          Pl(u, u.return), u.tag !== 5 && u.tag !== 27 || Qe(u), Yu(
            u,
            a
          );
          break;
        case 6:
          Qe(u);
          break;
        case 26:
          Pl(u, u.return), e = u.stateNode, u.memoizedState !== null || e === null || vl || e.parentNode.removeChild(e), Yu(
            u,
            a
          );
          break;
        case 22:
          u.memoizedState === null && Yu(
            u,
            a
          );
          break;
        case 30:
          Pl(u, u.return), Yu(
            u,
            a
          );
          break;
        case 7:
          Pl(u, u.return);
        default:
          Yu(
            u,
            a
          );
      }
      l = l.sibling;
    }
  }
  function Lt(l, t, u) {
    for (u = (t.subtreeFlags & 8772) !== 0 ? u : u & -2, t = t.child; t !== null; ) {
      var a = t.alternate, e = l, n = t, i = n.flags, f = (u & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          Lt(
            e,
            n,
            u
          ), Xe(4, n);
          break;
        case 1:
          if (Lt(
            e,
            n,
            u
          ), a = n, e = a.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (g) {
              dl(a, a.return, g);
            }
          if (a = n, e = a.updateQueue, e !== null) {
            var c = a.stateNode;
            try {
              var d = e.shared.hiddenCallbacks;
              if (d !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < d.length; e++)
                  Fs(d[e], c);
            } catch (g) {
              dl(a, a.return, g);
            }
          }
          f && i & 64 && fv(n), kt(n, n.return);
          break;
        case 27:
          (u & 2) !== 0 && vv(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || ov(n), Lt(
            e,
            n,
            u
          ), f && a === null && i & 4 && yc(n), kt(n, n.return);
          break;
        case 6:
          ov(n);
          break;
        case 26:
          c = n.stateNode, n.memoizedState !== null || c === null || Jl || vo(
            Ie(c.ownerDocument),
            n.type,
            c
          ), Lt(
            e,
            n,
            u
          ), f && a === null && i & 4 && yc(n), kt(n, n.return);
          break;
        case 12:
          Lt(
            e,
            n,
            u
          );
          break;
        case 31:
          Lt(
            e,
            n,
            u
          ), f && i & 4 && _v(e, n);
          break;
        case 13:
          Lt(
            e,
            n,
            u
          ), f && i & 4 && Ov(e, n);
          break;
        case 22:
          n.memoizedState === null && Lt(
            e,
            n,
            u
          ), kt(n, n.return);
          break;
        case 30:
          Lt(
            e,
            n,
            u
          ), kt(n, n.return);
          break;
        case 7:
          kt(n, n.return);
        default:
          Lt(
            e,
            n,
            u
          );
      }
      t = t.sibling;
    }
  }
  function Mc(l, t) {
    var u = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (u = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== u && (l != null && l.refCount++, u != null && De(u));
  }
  function Uc(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && De(l));
  }
  function Yt(l, t, u, a) {
    var e = (u & 335544064) === u;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Mv(
          l,
          t,
          u,
          a
        ), t = t.sibling;
    else e && hv(t);
  }
  function Mv(l, t, u, a) {
    var e = (u & 335544064) === u;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && oi(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Yt(
          l,
          t,
          u,
          a
        ), n & 2048 && Xe(9, t);
        break;
      case 1:
        Yt(
          l,
          t,
          u,
          a
        );
        break;
      case 3:
        Yt(
          l,
          t,
          u,
          a
        ), e && Nc && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && De(n)));
        break;
      case 12:
        if (n & 2048) {
          Yt(
            l,
            t,
            u,
            a
          ), n = t.stateNode;
          try {
            var i = t.memoizedProps, f = i.id, c = i.onPostCommit;
            typeof c == "function" && c(
              f,
              t.alternate === null ? "mount" : "update",
              n.passiveEffectDuration,
              -0
            );
          } catch (d) {
            dl(t, t.return, d);
          }
        } else
          Yt(
            l,
            t,
            u,
            a
          );
        break;
      case 31:
        Yt(
          l,
          t,
          u,
          a
        );
        break;
      case 13:
        Yt(
          l,
          t,
          u,
          a
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, f = t.alternate, t.memoizedState !== null ? (e && f !== null && f.memoizedState === null && oi(f), i._visibility & 2 ? Yt(
          l,
          t,
          u,
          a
        ) : Ve(
          l,
          t
        )) : (e && f !== null && f.memoizedState !== null && oi(t), i._visibility & 2 ? Yt(
          l,
          t,
          u,
          a
        ) : (i._visibility |= 2, Ka(
          l,
          t,
          u,
          a,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && Mc(f, t);
        break;
      case 24:
        Yt(
          l,
          t,
          u,
          a
        ), n & 2048 && Uc(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (lu(n.child, !0), lu(t.child, !0))), Yt(
          l,
          t,
          u,
          a
        );
        break;
      default:
        Yt(
          l,
          t,
          u,
          a
        );
    }
  }
  function Ka(l, t, u, a, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, f = u, c = a, d = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          Ka(
            n,
            i,
            f,
            c,
            e
          ), Xe(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? Ka(
            n,
            i,
            f,
            c,
            e
          ) : Ve(
            n,
            i
          ) : (g._visibility |= 2, Ka(
            n,
            i,
            f,
            c,
            e
          )), e && d & 2048 && Mc(
            i.alternate,
            i
          );
          break;
        case 24:
          Ka(
            n,
            i,
            f,
            c,
            e
          ), e && d & 2048 && Uc(i.alternate, i);
          break;
        default:
          Ka(
            n,
            i,
            f,
            c,
            e
          );
      }
      t = t.sibling;
    }
  }
  function Ve(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var u = l, a = t, e = a.flags;
        switch (a.tag) {
          case 22:
            Ve(u, a), e & 2048 && Mc(
              a.alternate,
              a
            );
            break;
          case 24:
            Ve(u, a), e & 2048 && Uc(a.alternate, a);
            break;
          default:
            Ve(u, a);
        }
        t = t.sibling;
      }
  }
  var ra = 8192;
  function ya(l, t, u) {
    if (l.subtreeFlags & ra)
      for (l = l.child; l !== null; )
        Uv(
          l,
          t,
          u
        ), l = l.sibling;
  }
  function Uv(l, t, u) {
    switch (l.tag) {
      case 26:
        ya(
          l,
          t,
          u
        ), l.flags & ra && (l.memoizedState !== null ? wy(
          u,
          Vt,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && Bm(u, l)));
        break;
      case 5:
        ya(
          l,
          t,
          u
        ), l.flags & ra && (l = l.stateNode, (t & 335544128) === t && Bm(u, l));
        break;
      case 3:
      case 4:
        var a = Vt;
        Vt = Ie(l.stateNode.containerInfo), ya(
          l,
          t,
          u
        ), Vt = a;
        break;
      case 22:
        l.memoizedState === null && (a = l.alternate, a !== null && a.memoizedState !== null ? (a = ra, ra = 16777216, ya(
          l,
          t,
          u
        ), ra = a) : ya(
          l,
          t,
          u
        ));
        break;
      case 30:
        if ((l.flags & ra) !== 0 && (a = l.memoizedProps.name, a != null && a !== "auto")) {
          var e = l.stateNode;
          e.paired = null, Ot === null && (Ot = /* @__PURE__ */ new Map()), Ot.set(a, e);
        }
        ya(
          l,
          t,
          u
        );
        break;
      default:
        ya(
          l,
          t,
          u
        );
    }
  }
  function Cv(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Le(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var u = 0; u < t.length; u++) {
          var a = t[u];
          wl = a, Hv(
            a,
            l
          );
        }
      Cv(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        Rv(l), l = l.sibling;
  }
  function Rv(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Le(l), l.flags & 2048 && qu(9, l, l.return);
        break;
      case 3:
        Le(l);
        break;
      case 12:
        Le(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, di(l)) : Le(l);
        break;
      default:
        Le(l);
    }
  }
  function di(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var u = 0; u < t.length; u++) {
          var a = t[u];
          wl = a, Hv(
            a,
            l
          );
        }
      Cv(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          qu(8, t, t.return), di(t);
          break;
        case 22:
          u = t.stateNode, u._visibility & 2 && (u._visibility &= -3, di(t));
          break;
        default:
          di(t);
      }
      l = l.sibling;
    }
  }
  function Hv(l, t) {
    for (; wl !== null; ) {
      var u = wl;
      switch (u.tag) {
        case 0:
        case 11:
        case 15:
          qu(8, u, t);
          break;
        case 23:
        case 22:
          if (u.memoizedState !== null && u.memoizedState.cachePool !== null) {
            var a = u.memoizedState.cachePool.pool;
            a != null && a.refCount++;
          }
          break;
        case 24:
          De(u.memoizedState.cache);
      }
      if (a = u.child, a !== null) a.return = u, wl = a;
      else
        l: for (u = l; wl !== null; ) {
          a = wl;
          var e = a.sibling, n = a.return;
          if (Ev(a), a === u) {
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
  var Zr = {
    getCacheForType: function(l) {
      var t = Wl(Bl), u = t.data.get(l);
      return u === void 0 && (u = l(), t.data.set(l, u)), u;
    },
    cacheSignal: function() {
      return Wl(Bl).controller.signal;
    }
  }, Vr = typeof WeakMap == "function" ? WeakMap : Map, sl = 0, bl = null, w = null, I = 0, ml = 0, Nt = null, Gu = !1, Ja = !1, Cc = !1, bu = 0, Rl = 0, Xu = 0, ha = 0, ri = 0, At = 0, wa = 0, Ke = null, yt = null, Rc = !1, yi = 0, pv = 0, hi = 1 / 0, gi = null, Qu = null, Ml = 0, Kt = null, ga = null, eu = 0, Hc = 0, pc = null, jv = null, $a = null, Fa = null, Wa = null, Je = 0, Si = null;
  function Dt() {
    return (sl & 2) !== 0 && I !== 0 ? I & -I : U.T !== null ? Vc() : qo();
  }
  function xv() {
    if (At === 0)
      if ((I & 536870912) === 0 || J) {
        var l = mn;
        mn <<= 1, (mn & 3932160) === 0 && (mn = 262144), At = l;
      } else At = 536870912;
    return l = Il.current, l !== null && (l.flags |= 32), At;
  }
  function Ia(l, t) {
    if (t != null) {
      var u = l.stateNode, a = u.ref;
      a === null && (a = u.ref = ym(
        ou(l.memoizedProps, u)
      )), Fa === null && (Fa = []), Fa.push(t.bind(null, a));
    }
  }
  function ht(l, t, u) {
    (l === bl && (ml === 2 || ml === 9) || l.cancelPendingCommit !== null) && (ka(l, 0), Zu(
      l,
      I,
      At,
      !1
    )), de(l, u), ((sl & 2) === 0 || l !== bl) && (l === bl && ((sl & 2) === 0 && (ha |= u), Rl === 4 && Zu(
      l,
      I,
      At,
      !1
    )), nu(l));
  }
  function Bv(l, t, u) {
    if ((sl & 6) !== 0) throw Error(y(327));
    var a = !u && (t & 127) === 0 && (t & l.expiredLanes) === 0 || me(l, t), e = a ? Jr(l, t) : xc(l, t, !0), n = a;
    do {
      if (e === 0) {
        Ja && !a && Zu(l, t, 0, !1);
        break;
      } else {
        if (u = l.current.alternate, n && !Lr(u)) {
          e = xc(l, t, !1), n = !1;
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
              var f = l;
              e = Ke;
              var c = f.current.memoizedState.isDehydrated;
              if (c && (ka(f, i).flags |= 256), i = xc(
                f,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (Cc && !c) {
                  f.errorRecoveryDisabledLanes |= n, ha |= n, e = 4;
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
          ka(l, 0), Zu(l, t, 0, !0);
          break;
        }
        l: {
          switch (a = l, n = e, n) {
            case 0:
            case 1:
              throw Error(y(345));
            case 4:
              if ((t & 4194048) !== t && (t & 62914560) !== t)
                break;
            case 6:
              Zu(
                a,
                t,
                At,
                !Gu
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
          if ((t & 62914560) === t && (e = yi + 300 - St(), 10 < e)) {
            if (Zu(
              a,
              t,
              At,
              !Gu
            ), rn(a, 0, !0) !== 0) break l;
            eu = t, a.timeoutHandle = lo(
              qv.bind(
                null,
                a,
                u,
                yt,
                gi,
                Rc,
                t,
                At,
                ha,
                wa,
                Gu,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          qv(
            a,
            u,
            yt,
            gi,
            Rc,
            t,
            At,
            ha,
            wa,
            Gu,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    nu(l);
  }
  function qv(l, t, u, a, e, n, i, f, c, d, g, T, v, h) {
    l.timeoutHandle = -1;
    var O = t.subtreeFlags, C = (n & 335544064) === n;
    if (T = null, (C || O & 8192 || (O & 16785408) === 16785408) && (T = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Ft
    }, Ot = null, Uv(
      t,
      n,
      T
    ), C && (O = T, C = l.containerInfo, C = (C.nodeType === 9 ? C : C.ownerDocument).__reactViewTransition, C != null && (O.count++, O.waitingForViewTransition = !0, O = ln.bind(O), C.finished.then(O, O))), O = (n & 62914560) === n ? yi - St() : (n & 4194048) === n ? pv - St() : 0, O = $y(
      T,
      O
    ), O !== null)) {
      eu = n, l.cancelPendingCommit = O(
        Kv.bind(
          null,
          l,
          t,
          n,
          u,
          a,
          e,
          i,
          f,
          c,
          d,
          g,
          T,
          null,
          v,
          h
        )
      ), Zu(l, n, i, !d);
      return;
    }
    Kv(
      l,
      t,
      n,
      u,
      a,
      e,
      i,
      f,
      c,
      d,
      g,
      T
    );
  }
  function Lr(l) {
    for (var t = l; ; ) {
      var u = t.tag;
      if ((u === 0 || u === 11 || u === 15) && t.flags & 16384 && (u = t.updateQueue, u !== null && (u = u.stores, u !== null)))
        for (var a = 0; a < u.length; a++) {
          var e = u[a], n = e.getSnapshot;
          e = e.value;
          try {
            if (!zt(n(), e)) return !1;
          } catch {
            return !1;
          }
        }
      if (u = t.child, t.subtreeFlags & 16384 && u !== null)
        u.return = t, t = u;
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
  function Zu(l, t, u, a) {
    t = Ho(l, t), t &= ~ri, t &= ~ha, l.suspendedLanes |= t, l.pingedLanes &= ~t, a && (l.warmLanes |= t), a = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - Tt(e), i = 1 << n;
      a[n] = -1, e &= ~i;
    }
    u !== 0 && jo(l, u, t);
  }
  function bi() {
    return (sl & 6) === 0 ? (we(0), !1) : !0;
  }
  function jc() {
    if (w !== null) {
      if (ml === 0)
        var l = w.return;
      else
        l = w, du = ea = null, Zf(l), Ya = null, Ce = 0, l = w;
      for (; l !== null; )
        iv(l.alternate, l), l = l.return;
      w = null;
    }
  }
  function ka(l, t) {
    var u = l.timeoutHandle;
    return u !== -1 && (l.timeoutHandle = -1, ry(u)), u = l.cancelPendingCommit, u !== null && (l.cancelPendingCommit = null, u()), eu = 0, jc(), bl = l, w = u = vu(l.current, null), I = t, ml = 0, Nt = null, Gu = !1, Ja = me(l, t), Cc = !1, wa = At = ri = ha = Xu = Rl = 0, yt = Ke = null, Rc = !1, bu = Ho(l, t), Dn(), u;
  }
  function Yv(l, t) {
    L = null, U.H = kn, t === qa || t === Yn ? (t = Ks(), ml = 3) : t === Uf ? (t = Ks(), ml = 4) : ml = t === ac ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Nt = t, w === null && (Rl = 1, Pn(
      l,
      jt(t, l.current)
    ));
  }
  function Gv() {
    var l = Il.current;
    return l === null ? !0 : (I & 4194048) === I ? et === null : (I & 62914560) === I || (I & 536870912) !== 0 ? l === et : !1;
  }
  function Xv() {
    var l = U.H;
    return U.H = kn, l === null ? kn : l;
  }
  function Qv() {
    var l = U.A;
    return U.A = Zr, l;
  }
  function Ti() {
    Rl = 4, Gu || (I & 4194048) !== I && Il.current !== null || (Ja = !0), (Xu & 134217727) === 0 && (ha & 134217727) === 0 || bl === null || Zu(
      bl,
      I,
      At,
      !1
    );
  }
  function xc(l, t, u) {
    var a = sl;
    sl |= 2;
    var e = Xv(), n = Qv();
    (bl !== l || I !== t) && (gi = null, ka(l, t)), t = !1;
    var i = Rl;
    l: do
      try {
        if (ml !== 0 && w !== null) {
          var f = w, c = Nt;
          switch (ml) {
            case 8:
              jc(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              Il.current === null && (t = !0);
              var d = ml;
              if (ml = 0, Nt = null, Pa(l, f, c, d), u && Ja) {
                i = 0;
                break l;
              }
              break;
            default:
              d = ml, ml = 0, Nt = null, Pa(l, f, c, d);
          }
        }
        Kr(), i = Rl;
        break;
      } catch (g) {
        Yv(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, du = ea = null, sl = a, U.H = e, U.A = n, w === null && (bl = null, I = 0, Dn()), i;
  }
  function Kr() {
    for (; w !== null; ) Zv(w);
  }
  function Jr(l, t) {
    var u = sl;
    sl |= 2;
    var a = Xv(), e = Qv();
    bl !== l || I !== t ? (gi = null, hi = St() + 500, ka(l, t)) : Ja = me(
      l,
      t
    );
    l: do
      try {
        if (ml !== 0 && w !== null) {
          t = w;
          var n = Nt;
          t: switch (ml) {
            case 1:
              ml = 0, Nt = null, Pa(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Vs(n)) {
                ml = 0, Nt = null, Vv(t);
                break;
              }
              t = function() {
                ml !== 2 && ml !== 9 || bl !== l || (ml = 7), nu(l);
              }, n.then(t, t);
              break l;
            case 3:
              ml = 7;
              break l;
            case 4:
              ml = 5;
              break l;
            case 7:
              Vs(n) ? (ml = 0, Nt = null, Vv(t)) : (ml = 0, Nt = null, Pa(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (w.tag) {
                case 26:
                  i = w.memoizedState;
                case 5:
                case 27:
                  var f = w;
                  if (i ? jm(i) : f.stateNode.complete) {
                    ml = 0, Nt = null;
                    var c = f.sibling;
                    if (c !== null) w = c;
                    else {
                      var d = f.return;
                      d !== null ? (w = d, Ei(d)) : w = null;
                    }
                    break t;
                  }
              }
              ml = 0, Nt = null, Pa(l, t, n, 5);
              break;
            case 6:
              ml = 0, Nt = null, Pa(l, t, n, 6);
              break;
            case 8:
              jc(), Rl = 6;
              break l;
            default:
              throw Error(y(462));
          }
        }
        wr();
        break;
      } catch (g) {
        Yv(l, g);
      }
    while (!0);
    return du = ea = null, U.H = a, U.A = e, sl = u, w !== null ? 0 : (bl = null, I = 0, Dn(), Rl);
  }
  function wr() {
    for (; w !== null && !sd(); )
      Zv(w);
  }
  function Zv(l) {
    var t = ev(l.alternate, l, bu);
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : w = t;
  }
  function Vv(l) {
    var t = l, u = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = I0(
          u,
          t,
          t.pendingProps,
          t.type,
          void 0,
          I
        );
        break;
      case 11:
        t = I0(
          u,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          I
        );
        break;
      case 5:
        Zf(t);
        var a = t;
        a === Kl && (J ? (pn(a), a.tag === 5 && a.stateNode != null && (Tl = a.stateNode)) : (pn(a), J = !0));
      default:
        iv(u, t), t = w = Hs(t, bu), t = ev(u, t, bu);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : w = t;
  }
  function Pa(l, t, u, a) {
    du = ea = null, Zf(t), Ya = null, Ce = 0;
    var e = t.return;
    try {
      if (jr(
        l,
        e,
        t,
        u,
        I
      )) {
        Rl = 1, Pn(
          l,
          jt(u, l.current)
        ), w = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw w = e, n;
      Rl = 1, Pn(
        l,
        jt(u, l.current)
      ), w = null;
      return;
    }
    t.flags & 32768 ? (J || a === 1 ? l = !0 : Ja || (I & 536870912) !== 0 ? l = !1 : (Gu = l = !0, (a === 2 || a === 9 || a === 3 || a === 6) && (a = Il.current, a !== null && a.tag === 13 && (a.flags |= 16384))), Lv(t, l)) : Ei(t);
  }
  function Ei(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        Lv(
          t,
          Gu
        );
        return;
      }
      l = t.return;
      var u = Yr(
        t.alternate,
        t,
        bu
      );
      if (u !== null) {
        w = u;
        return;
      }
      if (t = t.sibling, t !== null) {
        w = t;
        return;
      }
      w = t = l;
    } while (t !== null);
    Rl === 0 && (Rl = 5);
  }
  function Lv(l, t) {
    do {
      var u = Gr(l.alternate, l);
      if (u !== null) {
        u.flags &= 32767, w = u;
        return;
      }
      if (u = l.return, u !== null && (u.flags |= 32768, u.subtreeFlags = 0, u.deletions = null), !t && (l = l.sibling, l !== null)) {
        w = l;
        return;
      }
      w = l = u;
    } while (l !== null);
    Rl = 6, w = null;
  }
  function Kv(l, t, u, a, e, n, i, f, c, d, g, T) {
    l.cancelPendingCommit = null;
    do
      zi();
    while (Ml !== 0);
    if ((sl & 6) !== 0) throw Error(y(327));
    if (t !== null) {
      if (t === l.current) throw Error(y(177));
      l === bl && (w = bl = null, I = 0), ga = t, Kt = l, eu = u, pc = e, jv = a, $r(
        l,
        t,
        u,
        i,
        f,
        c,
        T
      );
    }
  }
  function $r(l, t, u, a, e, n, i) {
    var f = t.lanes | t.childLanes;
    if (Hc = f, f |= hf, Td(
      l,
      u,
      f,
      a,
      e,
      n
    ), Fa = null, (u & 335544064) === u ? (Wa = zr(l), a = 10262) : (Wa = null, a = 10256), (t.subtreeFlags & a) !== 0 || (t.flags & a) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, ly(sn, function() {
      return Gc(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), fi = !1, a = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || a) {
      a = U.T, U.T = null, e = Y.p, Y.p = 2, n = sl, sl |= 4;
      try {
        Xr(l, t, u);
      } finally {
        sl = n, Y.p = e, U.T = a;
      }
    }
    Ml = 1, fi ? $a = Ty(
      i,
      l.containerInfo,
      Wa,
      Bc,
      qc,
      Wr,
      Yc,
      Gc,
      Fr
    ) : (Bc(), qc(), Yc());
  }
  function Fr(l) {
    if (Ml !== 0) {
      var t = Kt.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function Wr() {
    Ml === 3 && (Ml = 0, Dv(ga, Kt), Ml = 4);
  }
  function Bc() {
    if (Ml === 1) {
      Ml = 0;
      var l = Kt, t = ga, u = eu, a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = U.T, U.T = null;
        var e = Y.p;
        Y.p = 2;
        var n = sl;
        sl |= 4;
        try {
          Ze = si = !1, Nv(t, l, u), u = Ic;
          var i = zs(l.containerInfo), f = u.focusedElem, c = u.selectionRange;
          if (i !== f && f && f.ownerDocument && Es(
            f.ownerDocument.documentElement,
            f
          )) {
            if (c !== null && vf(f)) {
              var d = c.start, g = c.end;
              if (g === void 0 && (g = d), "selectionStart" in f)
                f.selectionStart = d, f.selectionEnd = Math.min(
                  g,
                  f.value.length
                );
              else {
                var T = f.ownerDocument || document, v = T && T.defaultView || window;
                if (v.getSelection) {
                  var h = v.getSelection(), O = f.textContent.length, C = Math.min(c.start, O), K = c.end === void 0 ? C : Math.min(c.end, O);
                  !h.extend && C > K && (i = K, K = C, C = i);
                  var m = Ts(
                    f,
                    C
                  ), o = Ts(
                    f,
                    K
                  );
                  if (m && o && (h.rangeCount !== 1 || h.anchorNode !== m.node || h.anchorOffset !== m.offset || h.focusNode !== o.node || h.focusOffset !== o.offset)) {
                    var r = T.createRange();
                    r.setStart(m.node, m.offset), h.removeAllRanges(), C > K ? (h.addRange(r), h.extend(o.node, o.offset)) : (r.setEnd(o.node, o.offset), h.addRange(r));
                  }
                }
              }
            }
            for (T = [], h = f; h = h.parentNode; )
              h.nodeType === 1 && T.push({
                element: h,
                left: h.scrollLeft,
                top: h.scrollTop
              });
            for (typeof f.focus == "function" && f.focus(), f = 0; f < T.length; f++) {
              var b = T[f];
              b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
            }
          }
          fe = !!Wc, Ic = Wc = null;
        } finally {
          sl = n, Y.p = e, U.T = a;
        }
      }
      l.current = t, Ml = 2;
    }
  }
  function qc() {
    if (Ml === 2) {
      Ml = 0;
      var l = Kt, t = ga, u = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || u) {
        u = U.T, U.T = null;
        var a = Y.p;
        Y.p = 2;
        var e = sl;
        sl |= 4;
        try {
          bv(l, t.alternate, t);
        } finally {
          sl = e, Y.p = a, U.T = u;
        }
      }
      Ml = 3;
    }
  }
  function Yc() {
    if (Ml === 4 || Ml === 3) {
      Ml = 0;
      var l = $a;
      $a = null, vd();
      var t = Kt, u = ga, a = eu, e = jv, n = (a & 335544064) === a ? 10262 : 10256;
      if ((u.subtreeFlags & n) !== 0 || (u.flags & n) !== 0 ? Ml = 5 : (Ml = 0, ga = Kt = null, Jv(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (Qu = null), Ji(a), u = u.stateNode, bt && typeof bt.onCommitFiberRoot == "function")
        try {
          bt.onCommitFiberRoot(
            ve,
            u,
            void 0,
            (u.current.flags & 128) === 128
          );
        } catch {
        }
      if (e !== null) {
        u = U.T, n = Y.p, Y.p = 2, U.T = null;
        try {
          for (var i = t.onRecoverableError, f = 0; f < e.length; f++) {
            var c = e[f];
            i(c.value, {
              componentStack: c.stack
            });
          }
        } finally {
          U.T = u, Y.p = n;
        }
      }
      if (e = Fa, i = Wa, Wa = null, e !== null && (Fa = null, i === null && (i = []), l !== null))
        for (c = 0; c < e.length; c++)
          u = (0, e[c])(
            i
          ), u !== void 0 && l.finished.finally(u);
      (eu & 3) !== 0 && zi(), nu(t), n = t.pendingLanes, (a & 261930) !== 0 && (n & 42) !== 0 ? t === Si ? Je++ : (Je = 0, Si = t) : (Je = 0, Si = null), we(0);
    }
  }
  function Jv(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, De(t)));
  }
  function zi() {
    return $a !== null && ($a.skipTransition(), $a = null), Bc(), qc(), Yc(), Gc();
  }
  function Gc() {
    if (Ml !== 5) return !1;
    var l = Kt, t = Hc;
    Hc = 0;
    var u = Ji(eu), a = U.T, e = Y.p;
    try {
      Y.p = 32 > u ? 32 : u, U.T = null, u = pc, pc = null;
      var n = Kt, i = eu;
      if (Ml = 0, ga = Kt = null, eu = 0, (sl & 6) !== 0) throw Error(y(331));
      var f = sl;
      if (sl |= 4, Rv(n.current), Mv(
        n,
        n.current,
        i,
        u
      ), sl = f, we(0, !1), bt && typeof bt.onPostCommitFiberRoot == "function")
        try {
          bt.onPostCommitFiberRoot(ve, n);
        } catch {
        }
      return !0;
    } finally {
      Y.p = e, U.T = a, Jv(l, t);
    }
  }
  function wv(l, t, u) {
    t = jt(u, t), t = uc(l.stateNode, t, 2), l = pu(l, t, 2), l !== null && (de(l, 2), nu(l));
  }
  function dl(l, t, u) {
    if (l.tag === 3)
      wv(l, l, u);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          wv(
            t,
            l,
            u
          );
          break;
        } else if (t.tag === 1) {
          var a = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof a.componentDidCatch == "function" && (Qu === null || !Qu.has(a))) {
            l = jt(u, l), u = V0(2), a = pu(t, u, 2), a !== null && (L0(
              u,
              a,
              t,
              l
            ), de(a, 2), nu(a));
            break;
          }
        }
        t = t.return;
      }
  }
  function Xc(l, t, u) {
    var a = l.pingCache;
    if (a === null) {
      a = l.pingCache = new Vr();
      var e = /* @__PURE__ */ new Set();
      a.set(t, e);
    } else
      e = a.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), a.set(t, e));
    e.has(u) || (Cc = !0, e.add(u), l = Ir.bind(null, l, t, u), t.then(l, l));
  }
  function Ir(l, t, u) {
    var a = l.pingCache;
    a !== null && a.delete(t), l.pingedLanes |= l.suspendedLanes & u, l.warmLanes &= ~u, bl === l && (I & u) === u && ((Rl === 4 || Rl === 3 && (I & 62914560) === I && 300 > St() - yi) && (sl & 2) === 0 ? ka(l, 0) : ri |= u, wa === I && (wa = 0)), nu(l);
  }
  function $v(l, t) {
    t === 0 && (t = po()), l = ta(l, t), l !== null && (de(l, t), nu(l));
  }
  function kr(l) {
    var t = l.memoizedState, u = 0;
    t !== null && (u = t.retryLane), $v(l, u);
  }
  function Pr(l, t) {
    var u = 0;
    switch (l.tag) {
      case 31:
      case 13:
        var a = l.stateNode, e = l.memoizedState;
        e !== null && (u = e.retryLane);
        break;
      case 19:
        a = l.stateNode;
        break;
      case 22:
        a = l.stateNode._retryCache;
        break;
      default:
        throw Error(y(314));
    }
    a !== null && a.delete(t), $v(l, u);
  }
  function ly(l, t) {
    return Zi(l, t);
  }
  var le = null, te = null, Qc = !1, _i = !1, Zc = !1, Vu = 0;
  function nu(l) {
    l !== te && l.next === null && (te === null ? le = te = l : te = te.next = l), _i = !0, Qc || (Qc = !0, uy());
  }
  function we(l, t) {
    if (!Zc && _i) {
      Zc = !0;
      do
        for (var u = !1, a = le; a !== null; ) {
          if (l !== 0) {
            var e = a.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = a.suspendedLanes, f = a.pingedLanes;
              n = (1 << 31 - Tt(42 | l) + 1) - 1, n &= e & ~(i & ~f), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (u = !0, kv(a, n));
          } else
            n = I, n = rn(
              a,
              a === bl ? n : 0,
              a.cancelPendingCommit !== null || a.timeoutHandle !== -1
            ), (n & 3) === 0 || me(a, n) || (u = !0, kv(a, n));
          a = a.next;
        }
      while (u);
      Zc = !1;
    }
  }
  function ty() {
    Fv();
  }
  function Fv() {
    _i = Qc = !1;
    var l = 0;
    Vu !== 0 && dy() && (l = Vu);
    for (var t = St(), u = null, a = le; a !== null; ) {
      var e = a.next, n = Wv(a, t);
      n === 0 ? (a.next = null, u === null ? le = e : u.next = e, e === null && (te = u)) : (u = a, (l !== 0 || (n & 3) !== 0) && (_i = !0)), a = e;
    }
    Ml !== 0 && Ml !== 5 || we(l), Vu !== 0 && (Vu = 0);
  }
  function Wv(l, t) {
    for (var u = l.suspendedLanes, a = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Tt(n), f = 1 << i, c = e[i];
      c === -1 ? ((f & u) === 0 || (f & a) !== 0) && (e[i] = bd(f, t)) : c <= t && (l.expiredLanes |= f), n &= ~f;
    }
    if (t = bl, u = I, u = rn(
      l,
      l === t ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), a = l.callbackNode, u === 0 || l === t && (ml === 2 || ml === 9) || l.cancelPendingCommit !== null)
      return a !== null && a !== null && Vi(a), l.callbackNode = null, l.callbackPriority = 0;
    if ((u & 3) === 0 || me(l, u)) {
      if (t = u & -u, t === l.callbackPriority) return t;
      switch (a !== null && Vi(a), Ji(u)) {
        case 2:
        case 8:
          u = Co;
          break;
        case 32:
          u = sn;
          break;
        case 268435456:
          u = Ro;
          break;
        default:
          u = sn;
      }
      return a = Iv.bind(null, l), u = Zi(u, a), l.callbackPriority = t, l.callbackNode = u, t;
    }
    return a !== null && a !== null && Vi(a), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function Iv(l, t) {
    if (Ml !== 0 && Ml !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var u = l.callbackNode;
    if (zi() && l.callbackNode !== u)
      return null;
    var a = I;
    return a = rn(
      l,
      l === bl ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), a === 0 ? null : (Bv(l, a, t), Wv(l, St()), l.callbackNode != null && l.callbackNode === u ? Iv.bind(null, l) : null);
  }
  function kv(l, t) {
    if (zi()) return null;
    Bv(l, t, !0);
  }
  function uy() {
    yy(function() {
      (sl & 6) !== 0 ? Zi(
        Uo,
        ty
      ) : Fv();
    });
  }
  function Vc() {
    if (Vu === 0) {
      var l = fa;
      l === 0 && (l = vn, vn <<= 1, (vn & 261888) === 0 && (vn = 256)), Vu = l;
    }
    return Vu;
  }
  function Pv(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : bn(l);
  }
  function ay(l, t, u, a, e) {
    if (t === "submit" && u && u.stateNode === e) {
      var n = Pv(
        (e[vt] || null).action
      ), i = a.submitter;
      i && (t = (t = i[vt] || null) ? Pv(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var f = new _n(
        "action",
        "action",
        null,
        a,
        e
      );
      l.push({
        event: f,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (a.defaultPrevented) {
                if (Vu !== 0) {
                  var c = new FormData(e, i);
                  If(
                    u,
                    {
                      pending: !0,
                      data: c,
                      method: e.method,
                      action: n
                    },
                    null,
                    c
                  );
                }
              } else
                typeof n == "function" && (f.preventDefault(), c = new FormData(e, i), If(
                  u,
                  {
                    pending: !0,
                    data: c,
                    method: e.method,
                    action: n
                  },
                  n,
                  c
                ));
            },
            currentTarget: e
          }
        ]
      });
    }
  }
  for (var Lc = 0; Lc < yf.length; Lc++) {
    var Kc = yf[Lc], ey = Kc.toLowerCase(), ny = Kc[0].toUpperCase() + Kc.slice(1);
    Qt(
      ey,
      "on" + ny
    );
  }
  Qt(Ns, "onAnimationEnd"), Qt(As, "onAnimationIteration"), Qt(Ds, "onAnimationStart"), Qt("dblclick", "onDoubleClick"), Qt("focusin", "onFocus"), Qt("focusout", "onBlur"), Qt(rr, "onTransitionRun"), Qt(yr, "onTransitionStart"), Qt(hr, "onTransitionCancel"), Qt(Ms, "onTransitionEnd"), _a("onMouseEnter", ["mouseout", "mouseover"]), _a("onMouseLeave", ["mouseout", "mouseover"]), _a("onPointerEnter", ["pointerout", "pointerover"]), _a("onPointerLeave", ["pointerout", "pointerover"]), ku(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), ku(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), ku("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), ku(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), ku(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), ku(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var $e = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), iy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat($e)
  );
  function lm(l, t) {
    t = (t & 4) !== 0;
    for (var u = 0; u < l.length; u++) {
      var a = l[u], e = a.event;
      a = a.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = a.length - 1; 0 <= i; i--) {
            var f = a[i], c = f.instance, d = f.currentTarget;
            if (f = f.listener, c !== n && e.isPropagationStopped())
              break l;
            n = f, e.currentTarget = d;
            try {
              n(e);
            } catch (g) {
              An(g);
            }
            e.currentTarget = null, n = c;
          }
        else
          for (i = 0; i < a.length; i++) {
            if (f = a[i], c = f.instance, d = f.currentTarget, f = f.listener, c !== n && e.isPropagationStopped())
              break l;
            n = f, e.currentTarget = d;
            try {
              n(e);
            } catch (g) {
              An(g);
            }
            e.currentTarget = null, n = c;
          }
      }
    }
  }
  function $(l, t) {
    var u = t[Go];
    u === void 0 && (u = t[Go] = /* @__PURE__ */ new Set());
    var a = l + "__bubble";
    u.has(a) || (tm(t, l, 2, !1), u.add(a));
  }
  function Jc(l, t, u) {
    var a = 0;
    t && (a |= 4), tm(
      u,
      l,
      a,
      t
    );
  }
  var Oi = "_reactListening" + Math.random().toString(36).slice(2);
  function wc(l) {
    if (!l[Oi]) {
      l[Oi] = !0, Zo.forEach(function(u) {
        u !== "selectionchange" && (iy.has(u) || Jc(u, !1, l), Jc(u, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Oi] || (t[Oi] = !0, Jc("selectionchange", !1, t));
    }
  }
  function tm(l, t, u, a) {
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
    u = e.bind(
      null,
      t,
      u,
      l
    ), e = void 0, !lf || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), a ? e !== void 0 ? l.addEventListener(t, u, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, u, !0) : e !== void 0 ? l.addEventListener(t, u, {
      passive: e
    }) : l.addEventListener(t, u, !1);
  }
  function $c(l, t, u, a, e) {
    var n = a;
    if ((t & 1) === 0 && (t & 2) === 0 && a !== null)
      l: for (; ; ) {
        if (a === null) return;
        var i = a.tag;
        if (i === 3 || i === 4) {
          var f = a.stateNode.containerInfo;
          if (f === e) break;
          if (i === 4)
            for (i = a.return; i !== null; ) {
              var c = i.tag;
              if ((c === 3 || c === 4) && i.stateNode.containerInfo === e)
                return;
              i = i.return;
            }
          for (; f !== null; ) {
            if (i = Iu(f), i === null) return;
            if (c = i.tag, c === 5 || c === 6 || c === 26 || c === 27) {
              a = n = i;
              continue l;
            }
            f = f.parentNode;
          }
        }
        a = a.return;
      }
    ts(function() {
      var d = n, g = ki(u), T = [];
      l: {
        var v = Us.get(l);
        if (v !== void 0) {
          var h = _n, O = l;
          switch (l) {
            case "keypress":
              if (En(u) === 0) break l;
            case "keydown":
            case "keyup":
              h = Ld;
              break;
            case "focusin":
              O = "focus", h = ef;
              break;
            case "focusout":
              O = "blur", h = ef;
              break;
            case "beforeblur":
            case "afterblur":
              h = ef;
              break;
            case "click":
              if (u.button === 2) break l;
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
              h = Hd;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              h = Fd;
              break;
            case Ns:
            case As:
            case Ds:
              h = xd;
              break;
            case Ms:
              h = Id;
              break;
            case "scroll":
            case "scrollend":
              h = Cd;
              break;
            case "wheel":
              h = Pd;
              break;
            case "copy":
            case "cut":
            case "paste":
              h = qd;
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
              h = wd;
              break;
            case "toggle":
            case "beforetoggle":
              h = tr;
          }
          var C = (t & 4) !== 0, K = !C && (l === "scroll" || l === "scrollend"), m = C ? v !== null ? v + "Capture" : null : v;
          C = [];
          for (var o = d, r; o !== null; ) {
            var b = o;
            if (r = b.stateNode, b = b.tag, b !== 5 && b !== 26 && b !== 27 || r === null || m === null || (b = he(o, m), b != null && C.push(
              Fe(o, b, r)
            )), K) break;
            o = o.return;
          }
          0 < C.length && (v = new h(
            v,
            O,
            null,
            u,
            g
          ), T.push({ event: v, listeners: C }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (h = l === "mouseover" || l === "pointerover", v = l === "mouseout" || l === "pointerout", h && u !== Ii && (O = u.relatedTarget || u.fromElement) && (Iu(O) || O[Ta]))
            break l;
          (v || h) && (O = g.window === g ? g : (h = g.ownerDocument) ? h.defaultView || h.parentWindow : window, v ? (h = u.relatedTarget || u.toElement, v = d, h = h ? Iu(h) : null, h !== null && (K = tl(h), C = h.tag, h !== K || C !== 5 && C !== 27 && C !== 6) && (h = null)) : (v = null, h = d), v !== h && (C = es, b = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (C = is, b = "onPointerLeave", m = "onPointerEnter", o = "pointer"), K = v == null ? O : ye(v), r = h == null ? O : ye(h), O = new C(
            b,
            o + "leave",
            v,
            u,
            g
          ), O.target = K, O.relatedTarget = r, b = null, Iu(g) === d && (C = new C(
            m,
            o + "enter",
            h,
            u,
            g
          ), C.target = r, C.relatedTarget = K, b = C), K = b, C = v && h ? $l(
            v,
            h,
            fy
          ) : null, v !== null && um(
            T,
            O,
            v,
            C,
            !1
          ), h !== null && K !== null && um(
            T,
            K,
            h,
            C,
            !0
          )));
        }
        l: {
          if (v = d ? ye(d) : window, h = v.nodeName && v.nodeName.toLowerCase(), h === "select" || h === "input" && v.type === "file")
            var M = rs;
          else if (ms(v))
            if (ys)
              M = vr;
            else {
              M = or;
              var k = cr;
            }
          else
            h = v.nodeName, !h || h.toLowerCase() !== "input" || v.type !== "checkbox" && v.type !== "radio" ? d && Wi(d.elementType) && (M = rs) : M = sr;
          if (M && (M = M(l, d))) {
            ds(
              T,
              M,
              u,
              g
            );
            break l;
          }
          k && k(l, v, d);
        }
        switch (k = d ? ye(d) : window, l) {
          case "focusin":
            (ms(k) || k.contentEditable === "true") && (Ua = k, mf = d, Oe = null);
            break;
          case "focusout":
            Oe = mf = Ua = null;
            break;
          case "mousedown":
            df = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            df = !1, _s(T, u, g);
            break;
          case "selectionchange":
            if (dr) break;
          case "keydown":
          case "keyup":
            _s(T, u, g);
        }
        var p;
        if (ff)
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
          Ma ? ss(l, u) && (q = "onCompositionEnd") : l === "keydown" && u.keyCode === 229 && (q = "onCompositionStart");
        q && (fs && u.locale !== "ko" && (Ma || q !== "onCompositionStart" ? q === "onCompositionEnd" && Ma && (p = us()) : (Ou = g, tf = "value" in Ou ? Ou.value : Ou.textContent, Ma = !0)), k = Ni(d, q), 0 < k.length && (q = new ns(
          q,
          l,
          null,
          u,
          g
        ), T.push({ event: q, listeners: k }), p ? q.data = p : (p = vs(u), p !== null && (q.data = p)))), (p = ar ? er(l, u) : nr(l, u)) && (q = Ni(d, "onBeforeInput"), 0 < q.length && (k = new ns(
          "onBeforeInput",
          "beforeinput",
          null,
          u,
          g
        ), T.push({
          event: k,
          listeners: q
        }), k.data = p)), ay(
          T,
          l,
          d,
          u,
          g
        );
      }
      lm(T, t);
    });
  }
  function Fe(l, t, u) {
    return {
      instance: l,
      listener: t,
      currentTarget: u
    };
  }
  function Ni(l, t) {
    for (var u = t + "Capture", a = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = he(l, u), e != null && a.unshift(
        Fe(l, e, n)
      ), e = he(l, t), e != null && a.push(
        Fe(l, e, n)
      )), l.tag === 3) return a;
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
  function um(l, t, u, a, e) {
    for (var n = t._reactName, i = []; u !== null && u !== a; ) {
      var f = u, c = f.alternate, d = f.stateNode;
      if (f = f.tag, c !== null && c === a) break;
      f !== 5 && f !== 26 && f !== 27 || d === null || (c = d, e ? (d = he(u, n), d != null && i.unshift(
        Fe(u, d, c)
      )) : e || (d = he(u, n), d != null && i.push(
        Fe(u, d, c)
      ))), u = u.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var cy = /\r\n?/g, oy = /\u0000|\uFFFD/g;
  function am(l) {
    return (typeof l == "string" ? l : "" + l).replace(cy, `
`).replace(oy, "");
  }
  function em(l, t) {
    return t = am(t), am(l) === t;
  }
  function rl(l, t, u, a, e, n) {
    switch (u) {
      case "children":
        if (typeof a == "string")
          t === "body" || t === "textarea" && a === "" || Na(l, a);
        else if (typeof a == "number" || typeof a == "bigint")
          t !== "body" && Na(l, "" + a);
        else return;
        break;
      case "className":
        Sn(l, "class", a);
        break;
      case "tabIndex":
        Sn(l, "tabindex", a);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Sn(l, u, a);
        break;
      case "style":
        Po(l, a, n);
        return;
      case "data":
        if (t !== "object") {
          Sn(l, "data", a);
          break;
        }
      case "src":
      case "href":
        if (a === "" && (t !== "a" || u !== "href")) {
          l.removeAttribute(u);
          break;
        }
        if (a == null || typeof a == "function" || typeof a == "symbol" || typeof a == "boolean") {
          l.removeAttribute(u);
          break;
        }
        a = bn(a), l.setAttribute(u, a);
        break;
      case "action":
      case "formAction":
        if (typeof a == "function") {
          l.setAttribute(
            u,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (u === "formAction" ? (t !== "input" && rl(l, t, "name", e.name, e, null), rl(
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
        if (a == null || typeof a == "symbol" || typeof a == "boolean") {
          l.removeAttribute(u);
          break;
        }
        a = bn(a), l.setAttribute(u, a);
        break;
      case "onClick":
        a != null && (l.onclick = Ft);
        return;
      case "onScroll":
        a != null && $("scroll", l);
        return;
      case "onScrollEnd":
        a != null && $("scrollend", l);
        return;
      case "dangerouslySetInnerHTML":
        if (a != null) {
          if (typeof a != "object" || !("__html" in a))
            throw Error(y(61));
          if (u = a.__html, u != null) {
            if (e.children != null) throw Error(y(60));
            n?.__html !== u && (l.innerHTML = u);
          }
        }
        break;
      case "multiple":
        l.multiple = a && typeof a != "function" && typeof a != "symbol";
        break;
      case "muted":
        l.muted = a && typeof a != "function" && typeof a != "symbol";
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
        if (a == null || typeof a == "function" || typeof a == "boolean" || typeof a == "symbol") {
          l.removeAttribute("xlink:href");
          break;
        }
        u = bn(a), l.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          u
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
        a != null && typeof a != "function" && typeof a != "symbol" ? l.setAttribute(u, a) : l.removeAttribute(u);
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
        a && typeof a != "function" && typeof a != "symbol" ? l.setAttribute(u, "") : l.removeAttribute(u);
        break;
      case "capture":
      case "download":
        a === !0 ? l.setAttribute(u, "") : a !== !1 && a != null && typeof a != "function" && typeof a != "symbol" ? l.setAttribute(u, a) : l.removeAttribute(u);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        a != null && typeof a != "function" && typeof a != "symbol" && !isNaN(a) && 1 <= a ? l.setAttribute(u, a) : l.removeAttribute(u);
        break;
      case "rowSpan":
      case "start":
        a == null || typeof a == "function" || typeof a == "symbol" || isNaN(a) ? l.removeAttribute(u) : l.setAttribute(u, a);
        break;
      case "popover":
        $("beforetoggle", l), $("toggle", l), gn(l, "popover", a);
        break;
      case "xlinkActuate":
        fu(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          a
        );
        break;
      case "xlinkArcrole":
        fu(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          a
        );
        break;
      case "xlinkRole":
        fu(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          a
        );
        break;
      case "xlinkShow":
        fu(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          a
        );
        break;
      case "xlinkTitle":
        fu(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          a
        );
        break;
      case "xlinkType":
        fu(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          a
        );
        break;
      case "xmlBase":
        fu(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          a
        );
        break;
      case "xmlLang":
        fu(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          a
        );
        break;
      case "xmlSpace":
        fu(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          a
        );
        break;
      case "is":
        gn(l, "is", a);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < u.length) || u[0] !== "o" && u[0] !== "O" || u[1] !== "n" && u[1] !== "N")
          u = Md.get(u) || u, gn(l, u, a);
        else return;
    }
    ol = !0;
  }
  function Fc(l, t, u, a, e, n) {
    switch (u) {
      case "style":
        Po(l, a, n);
        return;
      case "dangerouslySetInnerHTML":
        if (a != null) {
          if (typeof a != "object" || !("__html" in a))
            throw Error(y(61));
          if (u = a.__html, u != null) {
            if (e.children != null) throw Error(y(60));
            n?.__html !== u && (l.innerHTML = u);
          }
        }
        break;
      case "children":
        if (typeof a == "string") Na(l, a);
        else if (typeof a == "number" || typeof a == "bigint")
          Na(l, "" + a);
        else return;
        break;
      case "onScroll":
        a != null && $("scroll", l);
        return;
      case "onScrollEnd":
        a != null && $("scrollend", l);
        return;
      case "onClick":
        a != null && (l.onclick = Ft);
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
        if (!Vo.hasOwnProperty(u))
          l: {
            if (u[0] === "o" && u[1] === "n" && (e = u.endsWith("Capture"), n = u.slice(2, e ? u.length - 7 : void 0), t = l[vt] || null, t = t != null ? t[u] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof a == "function")) {
              typeof t != "function" && t !== null && (u in l ? l[u] = null : l.hasAttribute(u) && l.removeAttribute(u)), l.addEventListener(n, a, e);
              break l;
            }
            ol = !0, u in l ? l[u] = a : a === !0 ? l.setAttribute(u, "") : gn(l, u, a);
          }
        return;
    }
    ol = !0;
  }
  function lt(l, t, u) {
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
        $("error", l), $("load", l);
        var a = !1, e = !1, n;
        for (n in u)
          if (u.hasOwnProperty(n)) {
            var i = u[n];
            if (i != null)
              switch (n) {
                case "src":
                  a = !0;
                  break;
                case "srcSet":
                  e = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(y(137, t));
                default:
                  rl(l, t, n, i, u, null);
              }
          }
        e && rl(l, t, "srcSet", u.srcSet, u, null), a && rl(l, t, "src", u.src, u, null);
        return;
      case "input":
        $("invalid", l);
        var f = n = i = e = null, c = null, d = null;
        for (a in u)
          if (u.hasOwnProperty(a)) {
            var g = u[a];
            if (g != null)
              switch (a) {
                case "name":
                  e = g;
                  break;
                case "type":
                  i = g;
                  break;
                case "checked":
                  c = g;
                  break;
                case "defaultChecked":
                  d = g;
                  break;
                case "value":
                  n = g;
                  break;
                case "defaultValue":
                  f = g;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (g != null)
                    throw Error(y(137, t));
                  break;
                default:
                  rl(l, t, a, g, u, null);
              }
          }
        Fo(
          l,
          n,
          f,
          c,
          d,
          i,
          e,
          !1
        );
        return;
      case "select":
        $("invalid", l), a = i = n = null;
        for (e in u)
          if (u.hasOwnProperty(e) && (f = u[e], f != null))
            switch (e) {
              case "value":
                n = f;
                break;
              case "defaultValue":
                i = f;
                break;
              case "multiple":
                a = f;
              default:
                rl(l, t, e, f, u, null);
            }
        t = n, u = i, l.multiple = !!a, t != null ? Oa(l, !!a, t, !1) : u != null && Oa(l, !!a, u, !0);
        return;
      case "textarea":
        $("invalid", l), n = e = a = null;
        for (i in u)
          if (u.hasOwnProperty(i) && (f = u[i], f != null))
            switch (i) {
              case "value":
                a = f;
                break;
              case "defaultValue":
                e = f;
                break;
              case "children":
                n = f;
                break;
              case "dangerouslySetInnerHTML":
                if (f != null) throw Error(y(91));
                break;
              default:
                rl(l, t, i, f, u, null);
            }
        Io(l, a, e, n);
        return;
      case "option":
        for (c in u)
          u.hasOwnProperty(c) && (a = u[c], a != null) && (c === "selected" ? l.selected = a && typeof a != "function" && typeof a != "symbol" : rl(l, t, c, a, u, null));
        return;
      case "dialog":
        $("beforetoggle", l), $("toggle", l), $("cancel", l), $("close", l);
        break;
      case "iframe":
      case "object":
        $("load", l);
        break;
      case "video":
      case "audio":
        for (a = 0; a < $e.length; a++)
          $($e[a], l);
        break;
      case "image":
        $("error", l), $("load", l);
        break;
      case "details":
        $("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        $("error", l), $("load", l);
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
        for (d in u)
          if (u.hasOwnProperty(d) && (a = u[d], a != null))
            switch (d) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(y(137, t));
              default:
                rl(l, t, d, a, u, null);
            }
        return;
      default:
        if (Wi(t)) {
          for (g in u)
            u.hasOwnProperty(g) && (a = u[g], a !== void 0 && Fc(
              l,
              t,
              g,
              a,
              u,
              void 0
            ));
          return;
        }
    }
    for (f in u)
      u.hasOwnProperty(f) && (a = u[f], a != null && rl(l, t, f, a, u, null));
  }
  var sy = {};
  function vy(l, t, u, a) {
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
        var e = null, n = null, i = null, f = null, c = null, d = null, g = null;
        for (h in u) {
          var T = u[h];
          if (u.hasOwnProperty(h) && T != null)
            switch (h) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                c = T;
              default:
                a.hasOwnProperty(h) || rl(l, t, h, null, a, T);
            }
        }
        for (var v in a) {
          var h = a[v];
          if (T = u[v], a.hasOwnProperty(v) && (h != null || T != null))
            switch (v) {
              case "type":
                h !== T && (ol = !0), n = h;
                break;
              case "name":
                h !== T && (ol = !0), e = h;
                break;
              case "checked":
                h !== T && (ol = !0), d = h;
                break;
              case "defaultChecked":
                h !== T && (ol = !0), g = h;
                break;
              case "value":
                h !== T && (ol = !0), i = h;
                break;
              case "defaultValue":
                h !== T && (ol = !0), f = h;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (h != null)
                  throw Error(y(137, t));
                break;
              default:
                h !== T && rl(
                  l,
                  t,
                  v,
                  h,
                  a,
                  T
                );
            }
        }
        $i(
          l,
          i,
          f,
          c,
          d,
          g,
          n,
          e
        );
        return;
      case "select":
        h = i = f = v = null;
        for (n in u)
          if (c = u[n], u.hasOwnProperty(n) && c != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                h = c;
              default:
                a.hasOwnProperty(n) || rl(
                  l,
                  t,
                  n,
                  null,
                  a,
                  c
                );
            }
        for (e in a)
          if (n = a[e], c = u[e], a.hasOwnProperty(e) && (n != null || c != null))
            switch (e) {
              case "value":
                n !== c && (ol = !0), v = n;
                break;
              case "defaultValue":
                n !== c && (ol = !0), f = n;
                break;
              case "multiple":
                n !== c && (ol = !0), i = n;
              default:
                n !== c && rl(
                  l,
                  t,
                  e,
                  n,
                  a,
                  c
                );
            }
        t = f, u = i, a = h, v != null ? Oa(l, !!u, v, !1) : !!a != !!u && (t != null ? Oa(l, !!u, t, !0) : Oa(l, !!u, u ? [] : "", !1));
        return;
      case "textarea":
        h = v = null;
        for (f in u)
          if (e = u[f], u.hasOwnProperty(f) && e != null && !a.hasOwnProperty(f))
            switch (f) {
              case "value":
                break;
              case "children":
                break;
              default:
                rl(l, t, f, null, a, e);
            }
        for (i in a)
          if (e = a[i], n = u[i], a.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                e !== n && (ol = !0), v = e;
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
                e !== n && rl(l, t, i, e, a, n);
            }
        Wo(l, v, h);
        return;
      case "option":
        for (var O in u)
          v = u[O], u.hasOwnProperty(O) && v != null && !a.hasOwnProperty(O) && (O === "selected" ? l.selected = !1 : rl(
            l,
            t,
            O,
            null,
            a,
            v
          ));
        for (c in a)
          v = a[c], h = u[c], a.hasOwnProperty(c) && v !== h && (v != null || h != null) && (c === "selected" ? (v !== h && (ol = !0), l.selected = v && typeof v != "function" && typeof v != "symbol") : rl(
            l,
            t,
            c,
            v,
            a,
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
        for (var C in u)
          v = u[C], u.hasOwnProperty(C) && v != null && !a.hasOwnProperty(C) && rl(l, t, C, null, a, v);
        for (d in a)
          if (v = a[d], h = u[d], a.hasOwnProperty(d) && v !== h && (v != null || h != null))
            switch (d) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (v != null)
                  throw Error(y(137, t));
                break;
              default:
                rl(
                  l,
                  t,
                  d,
                  v,
                  a,
                  h
                );
            }
        return;
      default:
        if (Wi(t)) {
          for (var K in u)
            v = u[K], u.hasOwnProperty(K) && v !== void 0 && !a.hasOwnProperty(K) && Fc(
              l,
              t,
              K,
              void 0,
              a,
              v
            );
          for (g in a)
            v = a[g], h = u[g], !a.hasOwnProperty(g) || v === h || v === void 0 && h === void 0 || Fc(
              l,
              t,
              g,
              v,
              a,
              h
            );
          return;
        }
    }
    for (var m in u)
      v = u[m], u.hasOwnProperty(m) && v != null && !a.hasOwnProperty(m) && rl(l, t, m, null, a, v);
    for (T in a)
      v = a[T], h = u[T], !a.hasOwnProperty(T) || v === h || v == null && h == null || rl(l, t, T, v, a, h);
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
      for (var l = 0, t = 0, u = performance.getEntriesByType("resource"), a = 0; a < u.length; a++) {
        var e = u[a], n = e.transferSize, i = e.initiatorType, f = e.duration;
        if (n && f && nm(i)) {
          for (i = 0, f = e.responseEnd, a += 1; a < u.length; a++) {
            var c = u[a], d = c.startTime;
            if (d > f) break;
            var g = c.transferSize, T = c.initiatorType;
            g && nm(T) && (c = c.responseEnd, i += g * (c < f ? 1 : (f - d) / (c - d)));
          }
          if (--a, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var Wc = null, Ic = null;
  function We(l) {
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
  function cm(l, t, u, a) {
    return u = We(
      u
    ).createElement(l), u[Fl] = a, u[vt] = t, lt(u, l, t), Ll(u), u;
  }
  function kc(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Pc = null;
  function dy() {
    var l = window.event;
    return l && l.type === "popstate" ? l === Pc ? !1 : (Pc = l, !0) : (Pc = null, !1);
  }
  var lo = typeof setTimeout == "function" ? setTimeout : void 0, ry = typeof clearTimeout == "function" ? clearTimeout : void 0, om = typeof Promise == "function" ? Promise : void 0, sm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : lo, yy = typeof queueMicrotask == "function" ? queueMicrotask : typeof om < "u" ? function(l) {
    return om.resolve(null).then(l).catch(hy);
  } : lo;
  function hy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Lu(l) {
    return l === "head";
  }
  function vm(l, t) {
    var u = t, a = 0;
    do {
      var e = u.nextSibling;
      if (l.removeChild(u), e && e.nodeType === 8)
        if (u = e.data, u === "/$" || u === "/&") {
          if (a === 0) {
            l.removeChild(e), ce(t);
            return;
          }
          a--;
        } else if (u === "$" || u === "$?" || u === "$~" || u === "$!" || u === "&")
          a++;
        else if (u === "html")
          co(
            l.ownerDocument.documentElement
          );
        else if (u === "head") {
          u = l.ownerDocument.head, co(u);
          for (var n = u.firstChild; n; ) {
            var i = n.nextSibling, f = n.nodeName;
            n[re] || f === "SCRIPT" || f === "STYLE" || f === "LINK" && n.rel.toLowerCase() === "stylesheet" || u.removeChild(n), n = i;
          }
        } else
          u === "body" && co(l.ownerDocument.body);
      u = e;
    } while (u);
    ce(t);
  }
  function mm(l, t) {
    var u = l;
    l = 0;
    do {
      var a = u.nextSibling;
      if (u.nodeType === 1 ? t ? (u._stashedDisplay = u.style.display, u.style.display = "none") : (u.style.display = u._stashedDisplay || "", u.getAttribute("style") === "" && u.removeAttribute("style")) : u.nodeType === 3 && (t ? (u._stashedText = u.nodeValue, u.nodeValue = "") : u.nodeValue = u._stashedText || ""), a && a.nodeType === 8)
        if (u = a.data, u === "/$") {
          if (l === 0) break;
          l--;
        } else
          u !== "$" && u !== "$?" && u !== "$~" && u !== "$!" || l++;
      u = a;
    } while (u);
  }
  function dm(l, t, u) {
    if (t = CSS.escape(t) !== t ? "r-" + btoa(t).replace(/=/g, "") : t, l.style.viewTransitionName = t, u != null && (l.style.viewTransitionClass = u), u = getComputedStyle(l), u.display === "inline") {
      if (t = l.getClientRects(), t.length === 1) var a = 1;
      else
        for (var e = a = 0; e < t.length; e++) {
          var n = t[e];
          0 < n.width && 0 < n.height && a++;
        }
      a === 1 && (l = l.style, l.display = t.length === 1 ? "inline-block" : "block", l.marginTop = "-" + u.paddingTop, l.marginBottom = "-" + u.paddingBottom);
    }
  }
  function rm(l, t) {
    l = l.style, t = t.style;
    var u = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = u == null || typeof u == "boolean" ? "" : ("" + u).trim(), u = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = u == null || typeof u == "boolean" ? "" : ("" + u).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (u = t.display, l.display = u == null || typeof u == "boolean" ? "" : u, u = t.margin, u != null ? l.margin = u : (u = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = u == null || typeof u == "boolean" ? "" : u, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function gy(l, t, u) {
    return u = u.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= u.innerHeight && l.left <= u.innerWidth
    };
  }
  function to(l) {
    var t = l.getBoundingClientRect(), u = getComputedStyle(l);
    return gy(t, u, l);
  }
  function Sy(l) {
    return l.documentElement.clientHeight;
  }
  function by(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function Ty(l, t, u, a, e, n, i, f, c) {
    var d = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = d.startViewTransition({
        update: function() {
          var v = d.defaultView, h = v.navigation && v.navigation.transition, O = d.fonts.status;
          a();
          var C = [];
          if (O === "loaded" && (Sy(d), d.fonts.status === "loading" && C.push(d.fonts.ready)), O = C.length, l !== null)
            for (var K = l.suspenseyImages, m = 0, o = 0; o < K.length; o++) {
              var r = K[o];
              if (!r.complete) {
                var b = r.getBoundingClientRect();
                if (0 < b.bottom && 0 < b.right && b.top < v.innerHeight && b.left < v.innerWidth) {
                  if (m += xm(r), m > Mi) {
                    C.length = O;
                    break;
                  }
                  r = new Promise(
                    by.bind(r)
                  ), C.push(r);
                }
              }
            }
          if (0 < C.length)
            return v = Promise.race([
              Promise.all(C),
              new Promise(function(M) {
                return setTimeout(M, 500);
              })
            ]).then(e, e), (h ? Promise.allSettled([h.finished, v]) : v).then(n, n);
          if (e(), h)
            return h.finished.then(
              n,
              n
            );
          n();
        },
        types: u
      });
      d.__reactViewTransition = g;
      var T = [];
      return g.ready.then(
        function() {
          for (var v = d.documentElement.getAnimations({
            subtree: !0
          }), h = 0; h < v.length; h++) {
            var O = v[h], C = O.effect, K = C.pseudoElement;
            if (K != null && K.startsWith("::view-transition")) {
              T.push(O), O = C.getKeyframes();
              for (var m = K = void 0, o = !0, r = 0; r < O.length; r++) {
                var b = O[r], M = b.width;
                if (K === void 0) K = M;
                else if (K !== M) {
                  o = !1;
                  break;
                }
                if (M = b.height, m === void 0) m = M;
                else if (m !== M) {
                  o = !1;
                  break;
                }
                delete b.width, delete b.height, b.transform === "none" && delete b.transform;
              }
              o && K !== void 0 && m !== void 0 && (C.setKeyframes(O), o = getComputedStyle(
                C.target,
                C.pseudoElement
              ), o.width !== K || o.height !== m) && (o = O[0], o.width = K, o.height = m, o = O[O.length - 1], o.width = K, o.height = m, C.setKeyframes(O));
            }
          }
          i();
        },
        function(v) {
          d.__reactViewTransition === g && (d.__reactViewTransition = null);
          try {
            typeof v == "object" && v !== null && v.name === "InvalidStateError" && (v.message === "View transition was skipped because document visibility state is hidden." || v.message === "Skipping view transition because document visibility state has become hidden." || v.message === "Skipping view transition because viewport size changed." || v.message === "Transition was aborted because of invalid state") && (v = null), v !== null && c(v);
          } finally {
            a(), e(), i();
          }
        }
      ), g.finished.finally(function() {
        for (var v = 0; v < T.length; v++)
          T[v].cancel();
        d.__reactViewTransition === g && (d.__reactViewTransition = null), f();
      }), g;
    } catch {
      return a(), e(), i(), null;
    }
  }
  function Sa(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  Sa.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : Q({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, Sa.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, u = l.getAnimations({ subtree: !0 }), a = [], e = 0; e < u.length; e++) {
      var n = u[e].effect;
      n !== null && n.target === l && n.pseudoElement === t && a.push(u[e]);
    }
    return a;
  }, Sa.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function ym(l) {
    return {
      name: l,
      group: new Sa("group", l),
      imagePair: new Sa("image-pair", l),
      old: new Sa("old", l),
      new: new Sa("new", l)
    };
  }
  function Mt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  Mt.prototype.addEventListener = function(l, t, u) {
    var a = null, e = null;
    if (!(u != null && typeof u != "boolean" && (a = u.signal || null, a !== null && a.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (gm(n, l, t, u) === -1) {
        var i = this, f = t;
        u != null && typeof u != "boolean" && u.once === !0 && (f = function(c) {
          i.removeEventListener(
            l,
            t,
            u
          ), typeof t == "function" ? t.call(this, c) : t.handleEvent(c);
        }), a !== null && (e = i.removeEventListener.bind(
          i,
          l,
          t,
          u
        ), a.addEventListener("abort", e, { once: !0 }), e = a.removeEventListener.bind(a, "abort", e)), a = ue(u), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: u,
          attachedListener: f,
          cleanup: e
        }), S(
          this._fragmentFiber.child,
          !1,
          Ey,
          l,
          f,
          a
        );
      }
      this._eventListeners = n;
    }
  };
  function Ey(l, t, u, a) {
    return fl(l).addEventListener(
      t,
      u,
      a
    ), !1;
  }
  Mt.prototype.removeEventListener = function(l, t, u) {
    var a = this._eventListeners;
    if (a !== null && (t = gm(
      a,
      l,
      t,
      u
    ), t !== -1)) {
      var e = a[t];
      u = e.attachedListener;
      var n = e.cleanup;
      e = ue(e.optionsOrUseCapture), S(
        this._fragmentFiber.child,
        !1,
        zy,
        l,
        u,
        e
      ), a.splice(t, 1), n !== null && n();
    }
  };
  function zy(l, t, u, a) {
    return fl(l).removeEventListener(
      t,
      u,
      a
    ), !1;
  }
  function ue(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function hm(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function gm(l, t, u, a) {
    if (l.length === 0) return -1;
    a = hm(a);
    for (var e = 0; e < l.length; e++) {
      var n = l[e];
      if (n.type === t && n.listener === u && hm(n.optionsOrUseCapture) === a)
        return e;
    }
    return -1;
  }
  Mt.prototype.dispatchEvent = function(l) {
    var t = D(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = fl(t);
    var u = this._eventListeners;
    if (u !== null && 0 < u.length || !l.bubbles) {
      var a = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (u)
        for (var e = 0; e < u.length; e++) {
          var n = u[e];
          a.addEventListener(
            n.type,
            n.attachedListener,
            ue(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(a), l = a.dispatchEvent(l), u)
        for (e = 0; e < u.length; e++)
          n = u[e], a.removeEventListener(
            n.type,
            n.attachedListener,
            ue(n.optionsOrUseCapture)
          );
      return t.removeChild(a), l;
    }
    return t.dispatchEvent(l);
  }, Mt.prototype.focus = function(l) {
    S(
      this._fragmentFiber.child,
      !0,
      Sm,
      l,
      void 0,
      void 0
    );
  };
  function Sm(l, t) {
    return l.tag === 6 ? !1 : (l = fl(l), jy(l, t));
  }
  Mt.prototype.focusLast = function(l) {
    var t = [];
    S(
      this._fragmentFiber.child,
      !0,
      uo,
      t,
      void 0,
      void 0
    );
    for (var u = t.length - 1; 0 <= u && !Sm(t[u], l); u--) ;
  };
  function uo(l, t) {
    return t.push(l), !1;
  }
  Mt.prototype.blur = function() {
    var l = D(
      this._fragmentFiber
    );
    l !== null && (l = fl(l), l = We(l).activeElement, l !== null && S(
      this._fragmentFiber.child,
      !1,
      _y,
      l,
      void 0,
      void 0
    ));
  };
  function _y(l, t) {
    return l.tag === 6 ? !1 : (l = fl(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  Mt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), S(
      this._fragmentFiber.child,
      !1,
      Oy,
      l,
      void 0,
      void 0
    );
  };
  function Oy(l, t) {
    return l.tag === 6 || (l = fl(l), t.observe(l)), !1;
  }
  Mt.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), S(
        this._fragmentFiber.child,
        !1,
        Ny,
        l,
        void 0,
        void 0
      );
      for (var u = t = 0; u < Jt.length; u++) {
        var a = Jt[u];
        a.fragmentInstance === this && a.observer === l ? l.unobserve(a.instance) : Jt[t++] = a;
      }
      Jt.length = t;
    }
  };
  function Ny(l, t) {
    return l.tag === 6 || (l = fl(l), t.unobserve(l)), !1;
  }
  var Jt = [], ao = !1;
  function Ay(l, t, u) {
    Jt.push({
      fragmentInstance: l,
      observer: t,
      instance: u
    }), ao || (ao = !0, xy(function() {
      ao = !1;
      var a = Jt;
      Jt = [];
      for (var e = 0; e < a.length; e++) {
        var n = a[e];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  Mt.prototype.getClientRects = function() {
    var l = [];
    return S(
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
      var u = l.ownerDocument.createRange();
      u.selectNodeContents(l), t.push.apply(t, u.getClientRects());
    } else
      l = fl(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  Mt.prototype.getRootNode = function(l) {
    var t = D(
      this._fragmentFiber
    );
    return t === null ? this : fl(t).getRootNode(l);
  }, Mt.prototype.compareDocumentPosition = function(l) {
    var t = D(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var u = [];
    S(
      this._fragmentFiber.child,
      !1,
      uo,
      u,
      void 0,
      void 0
    );
    var a = fl(t);
    if (u.length === 0) {
      if (u = a, Sl(this._fragmentFiber)) {
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
        t != null && (u = t);
      }
      t = this._fragmentFiber;
      var e = a = u.compareDocumentPosition(l);
      return u === l ? e = Node.DOCUMENT_POSITION_CONTAINS : a & Node.DOCUMENT_POSITION_CONTAINED_BY && (u = Zl(t)[1], u === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = fl(u).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = fl(u[0]), e = fl(u[u.length - 1]);
    var n = Sl(this._fragmentFiber) ? t.parentElement : a;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    a = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), f = e.compareDocumentPosition(l), c = i & Node.DOCUMENT_POSITION_CONTAINED_BY || f & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return f = a && n && i & Node.DOCUMENT_POSITION_FOLLOWING && f & Node.DOCUMENT_POSITION_PRECEDING, t = a && t === l || n && e === l || c || f ? Node.DOCUMENT_POSITION_CONTAINED_BY : !a && t === l || !n && e === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || My(
      t,
      this._fragmentFiber,
      u[0],
      u[u.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function My(l, t, u, a, e) {
    var n = Iu(e);
    if (l & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (u = !!n)
        l: {
          for (; n !== null; ) {
            if (n.tag === 7 && (n === t || n.alternate === t)) {
              u = !0;
              break l;
            }
            n = n.return;
          }
          u = !1;
        }
      return u;
    }
    if (l & Node.DOCUMENT_POSITION_CONTAINS) {
      if (n === null)
        return n = e.ownerDocument, e === n || e === n.documentElement || e === n.body;
      l: {
        for (n = t, t = D(t); n !== null; ) {
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
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === u) && (t = $l(
      u,
      n,
      jl
    ), t === null ? t = !1 : (S(
      t,
      !0,
      gt,
      n,
      u
    ), n = yl, yl = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === a) && (t = $l(
      a,
      n,
      jl
    ), t === null ? t = !1 : (S(
      t,
      !0,
      Xl,
      n,
      a
    ), n = yl, Nl = yl = null, t = n !== null)), t) : !1;
  }
  function bm(l, t) {
    var u = l.ownerDocument.createRange();
    u.selectNodeContents(l), l = u.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  Mt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(y(566));
    var t = [];
    S(
      this._fragmentFiber.child,
      !1,
      uo,
      t,
      void 0,
      void 0
    );
    var u = l !== !1;
    if (t.length === 0) {
      var a = Zl(
        this._fragmentFiber
      );
      if (a = u ? a[1] || a[0] || D(this._fragmentFiber) : a[0] || a[1], a === null) return;
      if (a.tag === 6) {
        l = fl(a), bm(l, u);
        return;
      }
      if (a = fl(a), a.nodeType !== 9) {
        if (a.nodeType === 11) {
          u = "host" in a ? a.host : null, u !== null && u.scrollIntoView(l);
          return;
        }
        a.scrollIntoView(l);
      }
    }
    for (a = u ? t.length - 1 : 0; a !== (u ? -1 : t.length); ) {
      var e = t[a];
      e.tag === 6 ? (e = fl(e), bm(e, u)) : fl(e).scrollIntoView(l), a += u ? -1 : 1;
    }
  };
  function Uy(l, t) {
    return l = fl(l), Tm(l, t), !1;
  }
  function Tm(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function Em(l, t) {
    var u = t._eventListeners;
    if (u !== null)
      for (var a = 0; a < u.length; a++) {
        var e = u[a];
        l.addEventListener(
          e.type,
          e.attachedListener,
          ue(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (u = t._observers, u !== null && u.forEach(function(n) {
      for (var i = 0, f = 0; f < Jt.length; f++) {
        var c = Jt[f];
        (c.fragmentInstance !== t || c.observer !== n || c.instance !== l) && (Jt[i++] = c);
      }
      Jt.length = i, n.observe(l);
    }), Tm(l, t));
  }
  function Cy(l, t) {
    var u = t._eventListeners;
    if (u !== null)
      for (var a = 0; a < u.length; a++) {
        var e = u[a];
        l.removeEventListener(
          e.type,
          e.attachedListener,
          ue(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (u = t._observers, u !== null && u.forEach(function(n) {
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
      var u = t;
      switch (t = t.nextSibling, u.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          eo(u), hn(u);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (u.rel.toLowerCase() === "stylesheet") continue;
      }
      l.removeChild(u);
    }
  }
  function Ry(l, t, u, a) {
    for (; l.nodeType === 1; ) {
      var e = u;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!a && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (a) {
        if (!l[re])
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
      if (l = Gt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function Hy(l, t, u) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !u || (l = Gt(l.nextSibling), l === null)) return null;
    return l;
  }
  function zm(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Gt(l.nextSibling), l === null)) return null;
    return l;
  }
  function no(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function io(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function py(l, t) {
    var u = l.ownerDocument;
    if (l.data === "$~") l._reactRetry = t;
    else if (l.data !== "$?" || u.readyState !== "loading")
      t();
    else {
      var a = function() {
        t(), u.removeEventListener("DOMContentLoaded", a);
      };
      u.addEventListener("DOMContentLoaded", a), l._reactRetry = a;
    }
  }
  function Gt(l) {
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
  function _m(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var u = l.data;
        if (u === "/$" || u === "/&") {
          if (t === 0)
            return Gt(l.nextSibling);
          t--;
        } else
          u !== "$" && u !== "$!" && u !== "$?" && u !== "$~" && u !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function Om(l) {
    l = l.previousSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var u = l.data;
        if (u === "$" || u === "$!" || u === "$?" || u === "$~" || u === "&") {
          if (t === 0) return l;
          t--;
        } else u !== "/$" && u !== "/&" || t++;
      }
      l = l.previousSibling;
    }
    return null;
  }
  function jy(l, t) {
    function u() {
      a = !0;
    }
    if (l.ownerDocument.activeElement === l) return !0;
    var a = !1;
    try {
      l.ownerDocument.addEventListener("focus", u, !0), (l.focus || HTMLElement.prototype.focus).call(l, t);
    } finally {
      l.ownerDocument.removeEventListener("focus", u, !0);
    }
    return a;
  }
  function xy(l) {
    sm(function() {
      sm(function(t) {
        return l(t);
      });
    });
  }
  function Nm(l, t, u) {
    switch (t = We(u), l) {
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
  function Am(l, t, u) {
    for (var a in u) {
      var e = u[a];
      u.hasOwnProperty(a) && e != null && rl(l, t, a, null, sy, e);
    }
    u.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === Ft && (l.onclick = null), hn(l);
  }
  function co(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    hn(l);
  }
  var Xt = /* @__PURE__ */ new Map(), Dm = /* @__PURE__ */ new Set();
  function Ie(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var Tu = Y.d;
  Y.d = {
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
    var l = Tu.f(), t = bi();
    return l || t;
  }
  function qy(l) {
    var t = Ea(l);
    t !== null && t.tag === 5 && t.type === "form" ? U0(t) : Tu.r(l);
  }
  var ae = typeof document > "u" ? null : document;
  function Mm(l, t, u) {
    var a = ae;
    if (a && typeof t == "string" && t) {
      var e = Ht(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof u == "string" && (e += '[crossorigin="' + u + '"]'), Dm.has(e) || (Dm.add(e), l = { rel: l, crossOrigin: u, href: t }, a.querySelector(e) === null && (t = a.createElement("link"), lt(t, "link", l), Ll(t), a.head.appendChild(t)));
    }
  }
  function Yy(l) {
    Tu.D(l), Mm("dns-prefetch", l, null);
  }
  function Gy(l, t) {
    Tu.C(l, t), Mm("preconnect", l, t);
  }
  function Xy(l, t, u) {
    Tu.L(l, t, u);
    var a = ae;
    if (a && l && t) {
      var e = 'link[rel="preload"][as="' + Ht(t) + '"]';
      t === "image" && u && u.imageSrcSet ? (e += '[imagesrcset="' + Ht(
        u.imageSrcSet
      ) + '"]', typeof u.imageSizes == "string" && (e += '[imagesizes="' + Ht(
        u.imageSizes
      ) + '"]')) : e += '[href="' + Ht(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = ee(l);
          break;
        case "script":
          n = ne(l);
      }
      if (!(Xt.has(n) || (l = Q(
        {
          rel: "preload",
          href: t === "image" && u && u.imageSrcSet ? void 0 : l,
          as: t
        },
        u
      ), Xt.set(n, l), a.querySelector(e) !== null || t === "style" && a.querySelector(ke(n)) || t === "script" && a.querySelector(Pe(n))))) {
        var i = a.createElement("link");
        lt(i, "link", l), t === "style" && (i[yn] = !0, i.onload = i.onerror = function() {
          Qo(i);
        }), Ll(i), a.head.appendChild(i);
      }
    }
  }
  function Qy(l, t) {
    Tu.m(l, t);
    var u = ae;
    if (u && l) {
      var a = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + Ht(a) + '"][href="' + Ht(l) + '"]', n = e;
      switch (a) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = ne(l);
      }
      if (!Xt.has(n) && (l = Q({ rel: "modulepreload", href: l }, t), Xt.set(n, l), u.querySelector(e) === null)) {
        switch (a) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (u.querySelector(Pe(n)))
              return;
        }
        a = u.createElement("link"), lt(a, "link", l), Ll(a), u.head.appendChild(a);
      }
    }
  }
  function Zy(l, t, u) {
    Tu.S(l, t, u);
    var a = ae;
    if (a && l) {
      var e = za(a).hoistableStyles, n = ee(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var f = { loading: 0, preload: null };
        if (i = a.querySelector(
          ke(n)
        ))
          f.loading = 5;
        else {
          l = Q(
            { rel: "stylesheet", href: l, "data-precedence": t },
            u
          ), (u = Xt.get(n)) && oo(l, u);
          var c = i = a.createElement("link");
          Ll(c), lt(c, "link", l), c._p = new Promise(function(d, g) {
            c.onload = d, c.onerror = g;
          }), c.addEventListener("load", function() {
            f.loading |= 1;
          }), c.addEventListener("error", function() {
            f.loading |= 2;
          }), f.loading |= 4, Ai(i, t, a);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: f
        }, e.set(n, i);
      }
    }
  }
  function Vy(l, t) {
    Tu.X(l, t);
    var u = ae;
    if (u && l) {
      var a = za(u).hoistableScripts, e = ne(l), n = a.get(e);
      n || (n = u.querySelector(Pe(e)), n || (l = Q({ src: l, async: !0 }, t), (t = Xt.get(e)) && so(l, t), n = u.createElement("script"), Ll(n), lt(n, "link", l), u.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, a.set(e, n));
    }
  }
  function Ly(l, t) {
    Tu.M(l, t);
    var u = ae;
    if (u && l) {
      var a = za(u).hoistableScripts, e = ne(l), n = a.get(e);
      n || (n = u.querySelector(Pe(e)), n || (l = Q({ src: l, async: !0, type: "module" }, t), (t = Xt.get(e)) && so(l, t), n = u.createElement("script"), Ll(n), lt(n, "link", l), u.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, a.set(e, n));
    }
  }
  function Um(l, t, u, a) {
    var e = (e = Eu.current) ? Ie(e) : null;
    if (!e) throw Error(y(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof u.precedence == "string" && typeof u.href == "string" ? (u = ee(u.href), t = za(
          e
        ).hoistableStyles, a = t.get(u), a || (a = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(u, a)), a) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (u.rel === "stylesheet" && typeof u.href == "string" && typeof u.precedence == "string") {
          l = ee(u.href);
          var n = za(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            ke(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Xt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: u.href,
            crossOrigin: u.crossOrigin,
            integrity: u.integrity,
            media: u.media,
            hrefLang: u.hrefLang,
            referrerPolicy: u.referrerPolicy
          }, Xt.set(l, n)), Ky(
            e,
            l,
            n,
            i.state
          ))), t && a === null)
            throw Error(y(528, ""));
          return i;
        }
        if (t && a !== null)
          throw Error(y(529, ""));
        return null;
      case "script":
        return t = u.async, u = u.src, typeof u == "string" && t && typeof t != "function" && typeof t != "symbol" ? (u = ne(u), t = za(
          e
        ).hoistableScripts, a = t.get(u), a || (a = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, t.set(u, a)), a) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(y(444, l));
    }
  }
  function ee(l) {
    return 'href="' + Ht(l) + '"';
  }
  function ke(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function Cm(l) {
    return Q({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function Ky(l, t, u, a) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[yn] !== !0) {
        a.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[yn] = !0, t.onload = t.onerror = Qo.bind(null, t), lt(t, "link", u), Ll(t), l.head.appendChild(t);
    a.preload = t, t.addEventListener("load", function() {
      return a.loading |= 1;
    }), t.addEventListener("error", function() {
      return a.loading |= 2;
    });
  }
  function ne(l) {
    return '[src="' + Ht(l) + '"]';
  }
  function Pe(l) {
    return "script[async]" + l;
  }
  function Rm(l, t, u) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var a = l.querySelector(
            'style[data-href~="' + Ht(u.href) + '"]'
          );
          if (a)
            return t.instance = a, Ll(a), a;
          var e = Q({}, u, {
            "data-href": u.href,
            "data-precedence": u.precedence,
            href: null,
            precedence: null
          });
          return a = (l.ownerDocument || l).createElement(
            "style"
          ), Ll(a), lt(a, "style", e), Ai(a, u.precedence, l), t.instance = a;
        case "stylesheet":
          e = ee(u.href);
          var n = l.querySelector(
            ke(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Ll(n), n;
          a = Cm(u), (e = Xt.get(e)) && oo(a, e), n = (l.ownerDocument || l).createElement("link"), Ll(n);
          var i = n;
          return i._p = new Promise(function(f, c) {
            i.onload = f, i.onerror = c;
          }), lt(n, "link", a), t.state.loading |= 4, Ai(n, u.precedence, l), t.instance = n;
        case "script":
          return n = ne(u.src), (e = l.querySelector(
            Pe(n)
          )) ? (t.instance = e, Ll(e), e) : (a = u, (e = Xt.get(n)) && (a = Q({}, u), so(a, e)), l = l.ownerDocument || l, e = l.createElement("script"), Ll(e), lt(e, "link", a), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(y(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (a = t.instance, t.state.loading |= 4, Ai(a, u.precedence, l));
    return t.instance;
  }
  function Ai(l, t, u) {
    for (var a = u.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = a.length ? a[a.length - 1] : null, n = e, i = 0; i < a.length; i++) {
      var f = a[i];
      if (f.dataset.precedence === t) n = f;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = u.nodeType === 9 ? u.head : u, t.insertBefore(l, t.firstChild));
  }
  function oo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function so(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Di = null;
  function Hm(l, t, u) {
    if (Di === null) {
      var a = /* @__PURE__ */ new Map(), e = Di = /* @__PURE__ */ new Map();
      e.set(u, a);
    } else
      e = Di, a = e.get(u), a || (a = /* @__PURE__ */ new Map(), e.set(u, a));
    if (a.has(l)) return a;
    for (a.set(l, null), u = u.getElementsByTagName(l), e = 0; e < u.length; e++) {
      var n = u[e];
      if (!(n[re] || n[Fl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var f = a.get(i);
        f ? f.push(n) : a.set(i, [n]);
      }
    }
    return a;
  }
  function vo(l, t, u) {
    l = l.ownerDocument || l, l.head.insertBefore(
      u,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function Jy(l, t, u) {
    if (u === 1 || t.itemProp != null) return !1;
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
  function pm(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function jm(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function xm(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Bm(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += xm(t), l.suspenseyImages.push(t)), l = Fy.bind(l), t.decode().then(l, l));
  }
  function wy(l, t, u, a) {
    if (u.type === "stylesheet" && (typeof a.media != "string" || matchMedia(a.media).matches !== !1) && (u.state.loading & 4) === 0) {
      if (u.instance === null) {
        var e = ee(a.href), n = t.querySelector(
          ke(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = ln.bind(l), t.then(l, l)), u.state.loading |= 4, u.instance = n, Ll(n);
          return;
        }
        n = t.ownerDocument || t, a = Cm(a), (e = Xt.get(e)) && oo(a, e), n = n.createElement("link"), Ll(n);
        var i = n;
        i._p = new Promise(function(f, c) {
          i.onload = f, i.onerror = c;
        }), lt(n, "link", a), u.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(u, t), (t = u.state.preload) && (u.state.loading & 3) === 0 && (l.count++, u = ln.bind(l), t.addEventListener("load", u), t.addEventListener("error", u));
    }
  }
  var Mi = 0;
  function $y(l, t) {
    return l.stylesheets && l.count === 0 && Ci(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(u) {
      var a = setTimeout(function() {
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
      return l.unsuspend = u, function() {
        l.unsuspend = null, clearTimeout(a), clearTimeout(e);
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
  function ln() {
    this.count--, qm(this);
  }
  function Fy() {
    this.imgCount--, qm(this);
  }
  var Ui = null;
  function Ci(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Ui = /* @__PURE__ */ new Map(), t.forEach(Wy, l), Ui = null, ln.call(l));
  }
  function Wy(l, t) {
    if (!(t.state.loading & 4)) {
      var u = Ui.get(l);
      if (u) var a = u.get(null);
      else {
        u = /* @__PURE__ */ new Map(), Ui.set(l, u);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (u.set(i.dataset.precedence, i), a = i);
        }
        a && u.set(null, a);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = u.get(i) || a, n === a && u.set(null, e), u.set(i, e), this.count++, a = ln.bind(this), e.addEventListener("load", a), e.addEventListener("error", a), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var ie = {
    $$typeof: Dl,
    Provider: null,
    Consumer: null,
    _currentValue: Rt,
    _currentValue2: Rt,
    _threadCount: 0
  };
  function Iy(l, t, u, a, e, n, i, f, c) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Li(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Li(0), this.hiddenUpdates = Li(null), this.identifierPrefix = a, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Ym(l, t, u, a, e, n, i, f, c, d, g, T) {
    return l = new Iy(
      l,
      t,
      u,
      i,
      c,
      d,
      g,
      T,
      f
    ), t = 1, n === !0 && (t |= 24), n = mt(3, null, null, t), l.current = n, n.stateNode = l, t = Af(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: a,
      isDehydrated: u,
      cache: t
    }, Cf(n), l;
  }
  function Gm(l) {
    return l ? (l = Ha, l) : Ha;
  }
  function Xm(l, t, u, a, e, n) {
    e = Gm(e), a.context === null ? a.context = e : a.pendingContext = e, a = Hu(t), a.payload = { element: u }, n = n === void 0 ? null : n, n !== null && (a.callback = n), u = pu(l, a, t), u !== null && (ht(u, l, t), Re(u, l, t));
  }
  function Qm(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var u = l.retryLane;
      l.retryLane = u !== 0 && u < t ? u : t;
    }
  }
  function mo(l, t) {
    Qm(l, t), (l = l.alternate) && Qm(l, t);
  }
  function Zm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = ta(l, 67108864);
      t !== null && ht(t, l, 67108864), mo(l, 67108864);
    }
  }
  function Vm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Dt();
      t = Ki(t);
      var u = ta(l, t);
      u !== null && ht(u, l, t), mo(l, t);
    }
  }
  var fe = !0;
  function ky(l, t, u, a) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 2, ro(l, t, u, a);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function Py(l, t, u, a) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 8, ro(l, t, u, a);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function ro(l, t, u, a) {
    if (fe) {
      var e = yo(a);
      if (e === null)
        $c(
          l,
          t,
          a,
          Ri,
          u
        ), Km(l, a);
      else if (th(
        e,
        l,
        t,
        u,
        a
      ))
        a.stopPropagation();
      else if (Km(l, a), t & 4 && -1 < lh.indexOf(l)) {
        for (; e !== null; ) {
          var n = Ea(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = Wu(n.pendingLanes);
                  if (i !== 0) {
                    var f = n;
                    for (f.pendingLanes |= 2, f.entangledLanes |= 2; i; ) {
                      var c = 1 << 31 - Tt(i);
                      f.entanglements[1] |= c, i &= ~c;
                    }
                    nu(n), (sl & 6) === 0 && (hi = St() + 500, we(0));
                  }
                }
                break;
              case 31:
              case 13:
                f = ta(n, 2), f !== null && ht(f, n, 2), bi(), mo(n, 2);
            }
          if (n = yo(a), n === null && $c(
            l,
            t,
            a,
            Ri,
            u
          ), n === e) break;
          e = n;
        }
        e !== null && a.stopPropagation();
      } else
        $c(
          l,
          t,
          a,
          null,
          u
        );
    }
  }
  function yo(l) {
    return l = ki(l), ho(l);
  }
  var Ri = null;
  function ho(l) {
    if (Ri = null, l = Iu(l), l !== null) {
      var t = tl(l);
      if (t === null) l = null;
      else {
        var u = t.tag;
        if (u === 13) {
          if (l = gl(t), l !== null) return l;
          l = null;
        } else if (u === 31) {
          if (l = Ul(t), l !== null) return l;
          l = null;
        } else if (u === 3) {
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
        switch (md()) {
          case Uo:
            return 2;
          case Co:
            return 8;
          case sn:
          case dd:
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
  var go = !1, Ku = null, Ju = null, wu = null, tn = /* @__PURE__ */ new Map(), un = /* @__PURE__ */ new Map(), $u = [], lh = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Km(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        Ku = null;
        break;
      case "dragenter":
      case "dragleave":
        Ju = null;
        break;
      case "mouseover":
      case "mouseout":
        wu = null;
        break;
      case "pointerover":
      case "pointerout":
        tn.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        un.delete(t.pointerId);
    }
  }
  function an(l, t, u, a, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: u,
      eventSystemFlags: a,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Ea(t), t !== null && Zm(t)), l) : (l.eventSystemFlags |= a, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function th(l, t, u, a, e) {
    switch (t) {
      case "focusin":
        return Ku = an(
          Ku,
          l,
          t,
          u,
          a,
          e
        ), !0;
      case "dragenter":
        return Ju = an(
          Ju,
          l,
          t,
          u,
          a,
          e
        ), !0;
      case "mouseover":
        return wu = an(
          wu,
          l,
          t,
          u,
          a,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return tn.set(
          n,
          an(
            tn.get(n) || null,
            l,
            t,
            u,
            a,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, un.set(
          n,
          an(
            un.get(n) || null,
            l,
            t,
            u,
            a,
            e
          )
        ), !0;
    }
    return !1;
  }
  function Jm(l) {
    var t = Iu(l.target);
    if (t !== null) {
      var u = tl(t);
      if (u !== null) {
        if (t = u.tag, t === 13) {
          if (t = gl(u), t !== null) {
            l.blockedOn = t, Yo(l.priority, function() {
              Vm(u);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Ul(u), t !== null) {
            l.blockedOn = t, Yo(l.priority, function() {
              Vm(u);
            });
            return;
          }
        } else if (t === 3 && u.stateNode.current.memoizedState.isDehydrated) {
          l.blockedOn = u.tag === 3 ? u.stateNode.containerInfo : null;
          return;
        }
      }
    }
    l.blockedOn = null;
  }
  function Hi(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var u = yo(l.nativeEvent);
      if (u === null) {
        u = l.nativeEvent;
        var a = new u.constructor(
          u.type,
          u
        );
        Ii = a, u.target.dispatchEvent(a), Ii = null;
      } else
        return t = Ea(u), t !== null && Zm(t), l.blockedOn = u, !1;
      t.shift();
    }
    return !0;
  }
  function wm(l, t, u) {
    Hi(l) && u.delete(t);
  }
  function uh() {
    go = !1, Ku !== null && Hi(Ku) && (Ku = null), Ju !== null && Hi(Ju) && (Ju = null), wu !== null && Hi(wu) && (wu = null), tn.forEach(wm), un.forEach(wm);
  }
  function pi(l, t) {
    l.blockedOn === t && (l.blockedOn = null, go || (go = !0, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      uh
    )));
  }
  var ji = null;
  function $m(l) {
    ji !== l && (ji = l, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      function() {
        ji === l && (ji = null);
        for (var t = 0; t < l.length; t += 3) {
          var u = l[t], a = l[t + 1], e = l[t + 2];
          if (typeof a != "function") {
            if (ho(a || u) === null)
              continue;
            break;
          }
          var n = Ea(u);
          n !== null && (l.splice(t, 3), t -= 3, If(
            n,
            {
              pending: !0,
              data: e,
              method: u.method,
              action: a
            },
            a,
            e
          ));
        }
      }
    ));
  }
  function ce(l) {
    function t(c) {
      return pi(c, l);
    }
    Ku !== null && pi(Ku, l), Ju !== null && pi(Ju, l), wu !== null && pi(wu, l), tn.forEach(t), un.forEach(t);
    for (var u = 0; u < $u.length; u++) {
      var a = $u[u];
      a.blockedOn === l && (a.blockedOn = null);
    }
    for (; 0 < $u.length && (u = $u[0], u.blockedOn === null); )
      Jm(u), u.blockedOn === null && $u.shift();
    if (u = (l.ownerDocument || l).$$reactFormReplay, u != null)
      for (a = 0; a < u.length; a += 3) {
        var e = u[a], n = u[a + 1], i = e[vt] || null;
        if (typeof n == "function")
          i || $m(u);
        else if (i) {
          var f = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[vt] || null)
              f = i.formAction;
            else if (ho(e) !== null) continue;
          } else f = i.action;
          typeof f == "function" ? u[a + 1] = f : (u.splice(a, 3), a -= 3), $m(u);
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
      e !== null && (e(), e = null), a || setTimeout(u, 20);
    }
    function u() {
      if (!a && !navigation.transition) {
        var n = navigation.currentEntry;
        n && n.url != null && navigation.navigate(n.url, {
          state: n.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var a = !1, e = null;
      return navigation.addEventListener("navigate", l), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(u, 100), function() {
        a = !0, navigation.removeEventListener("navigate", l), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), e !== null && (e(), e = null);
      };
    }
  }
  function So(l) {
    this._internalRoot = l;
  }
  xi.prototype.render = So.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(y(409));
    var u = t.current, a = Dt();
    Xm(u, a, l, t, null, null);
  }, xi.prototype.unmount = So.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Xm(l.current, 2, null, l, null, null), bi(), t[Ta] = null;
    }
  };
  function xi(l) {
    this._internalRoot = l;
  }
  xi.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = qo();
      l = { blockedOn: null, target: l, priority: t };
      for (var u = 0; u < $u.length && t !== 0 && t < $u[u].priority; u++) ;
      $u.splice(u, 0, l), u === 0 && Jm(l);
    }
  };
  var Wm = el.version;
  if (Wm !== "19.3.0")
    throw Error(
      y(
        527,
        Wm,
        "19.3.0"
      )
    );
  Y.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(y(188)) : (l = Object.keys(l).join(","), Error(y(268, l)));
    return l = _l(t), l = l !== null ? x(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var ah = {
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
          ah
        ), bt = Bi;
      } catch {
      }
  }
  return nn.createRoot = function(l, t) {
    if (!nl(l)) throw Error(y(299));
    var u = !1, a = "", e = G0, n = X0, i = Q0;
    return t != null && (t.unstable_strictMode === !0 && (u = !0), t.identifierPrefix !== void 0 && (a = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Ym(
      l,
      1,
      !1,
      null,
      null,
      u,
      a,
      null,
      e,
      n,
      i,
      Fm
    ), l[Ta] = t.current, wc(l), new So(t);
  }, nn.hydrateRoot = function(l, t, u) {
    if (!nl(l)) throw Error(y(299));
    var a = !1, e = "", n = G0, i = X0, f = Q0, c = null;
    return u != null && (u.unstable_strictMode === !0 && (a = !0), u.identifierPrefix !== void 0 && (e = u.identifierPrefix), u.onUncaughtError !== void 0 && (n = u.onUncaughtError), u.onCaughtError !== void 0 && (i = u.onCaughtError), u.onRecoverableError !== void 0 && (f = u.onRecoverableError), u.formState !== void 0 && (c = u.formState)), t = Ym(
      l,
      1,
      !0,
      t,
      u ?? null,
      a,
      e,
      c,
      n,
      i,
      f,
      Fm
    ), t.context = Gm(null), u = t.current, a = Dt(), a = Ki(a), e = Hu(a), e.callback = null, pu(u, e, a), u = a, t.current.lanes = u, de(t, u), nu(t), l[Ta] = t.current, wc(l), new xi(t);
  }, nn.version = "19.3.0", nn;
}
var id;
function dh() {
  if (id) return Eo.exports;
  id = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (el) {
        console.error(el);
      }
  }
  return A(), Eo.exports = mh(), Eo.exports;
}
var rh = dh();
function yh(A = "/api") {
  async function el(V, y, nl) {
    const tl = await fetch(`${A.replace(/\/$/, "")}/${V}`, {
      ...y ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(y) } : {},
      signal: nl
    });
    if (!tl.ok) {
      const gl = await tl.json().catch(() => ({}));
      throw new Error(gl.error || `Erro HTTP ${tl.status}`);
    }
    return V === "export" ? tl.blob() : tl.json();
  }
  return { catalog: (V) => el("catalog", null, V), preview: (V, y) => el("preview", V, y), export: (V, y) => el("export", V, y) };
}
const fd = {
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
  if (fd[A]) return fd[A];
  const el = String(A).replace(/^\d+_/, "").replaceAll("_", " ");
  return el.charAt(0).toLocaleUpperCase("pt-BR") + el.slice(1);
};
function hh(A) {
  let el = "";
  try {
    el = JSON.parse(A.detail).categorias || "";
  } catch {
    el = "";
  }
  const V = {};
  for (const y of String(el).split("|")) {
    const nl = y.indexOf(":");
    if (nl < 1) continue;
    const tl = y.slice(0, nl).trim(), gl = y.slice(nl + 1).trim();
    tl && gl && (V[tl] = gl);
  }
  return V;
}
const cd = { fgb: 6500, gpkg: 1900, shp: 250 };
function gh({ apiBaseUrl: A = "/api", client: el, value: V, onChange: y, onExport: nl, download: tl = !0, className: gl = "" }) {
  const Ul = Hl.useMemo(() => el || yh(A), [el, A]), [zl, _l] = Hl.useState(null), [x, S] = Hl.useState({ attributes: [], format: "fgb" }), D = V ?? x, [Sl, Zl] = Hl.useState(""), [Ol, fl] = Hl.useState("2022"), [yl, Nl] = Hl.useState(""), [gt, Xl] = Hl.useState(""), [jl, $l] = Hl.useState({}), [Q, P] = Hl.useState(0), [st, Vl] = Hl.useState(""), [xl, ut] = Hl.useState(!1), [wt, Ut] = Hl.useState(""), [Dl, N] = Hl.useState(null), j = Hl.useRef(!0);
  Hl.useEffect(() => {
    j.current = !0;
    const E = new AbortController();
    return _l(null), Vl(""), Ul.catalog(E.signal).then((G) => {
      _l(G), Zl(G.attributes.find((Z) => Z.source === "IBGE · Censo 2022")?.source || G.attributes[0]?.source || "");
    }).catch((G) => {
      G.name !== "AbortError" && Vl(G.message);
    }), () => {
      j.current = !1, E.abort();
    };
  }, [Ul]);
  function B(E) {
    V === void 0 && S(E), y?.(E), Ut("");
  }
  const ul = zl?.attributes || [], cl = [...new Set(ul.map((E) => E.source))], nt = [...new Set(ul.filter((E) => E.source === Sl).map((E) => E.year))].sort((E, G) => G - E), Ct = nt.includes(Number(Ol)) ? Number(Ol) : nt[0], $t = ul.filter((E) => E.source === Sl && E.year === Ct), s = [...new Set($t.map((E) => E.theme))], _ = new Set(D.attributes), R = ul.filter((E) => _.has(E.id)), H = Hl.useMemo(() => new Map(ul.map((E) => [E.id, hh(E)])), [ul]), F = $t.filter((E) => (!yl || E.theme === yl) && `${E.label} ${E.field} ${E.unit}`.toLocaleLowerCase("pt-BR").includes(gt.toLocaleLowerCase("pt-BR"))), ll = (E, G) => Object.entries(jl).every(([Z, W]) => !W || Z === G || H.get(E.id)?.[Z] === W), il = (() => {
    if (!yl) return [];
    const E = /* @__PURE__ */ new Map();
    for (const G of F) for (const [Z, W] of Object.entries(H.get(G.id) || {}))
      E.has(Z) || E.set(Z, /* @__PURE__ */ new Set()), ll(G, Z) && E.get(Z).add(W);
    return [...E].map(([G, Z]) => [G, [...Z].sort((W, at) => W.localeCompare(at, "pt-BR", { numeric: !0 }))]).filter(([G, Z]) => Z.length > 1 || jl[G]).sort((G, Z) => G[0].localeCompare(Z[0], "pt-BR"));
  })(), U = F.filter((E) => ll(E, null)), Y = U.slice(Q * 40, Q * 40 + 40);
  Hl.useEffect(() => {
    P(0);
  }, [Sl, Ol, yl, gt, jl]), Hl.useEffect(() => {
    $l({});
  }, [Sl, Ol, yl]), Hl.useEffect(() => {
    if (N(null), !D.attributes.length) return;
    const E = new AbortController(), G = setTimeout(() => Ul.preview(D, E.signal).then(N).catch((Z) => {
      Z.name !== "AbortError" && Vl(Z.message);
    }), 250);
    return () => {
      clearTimeout(G), E.abort();
    };
  }, [Ul, D]);
  function Rt(E) {
    B({ ...D, attributes: _.has(E) ? D.attributes.filter((G) => G !== E) : [...D.attributes, E] });
  }
  async function oe() {
    ut(!0), Vl(""), Ut("Gerando geometria e tabela de atributos…");
    const E = { ...D, attributes: [...D.attributes] };
    try {
      const G = await Ul.export(E), Z = `municipios_sp_${E.format}.zip`;
      if (await nl?.({ blob: G, filename: Z, configuration: E, attributes: R }), tl) {
        const W = URL.createObjectURL(G), at = document.createElement("a");
        at.href = W, at.download = Z, at.click(), setTimeout(() => URL.revokeObjectURL(W), 1e4);
      }
      j.current && Ut("Camada gerada. O pacote contém a camada, o dicionário e os metadados.");
    } catch (G) {
      j.current && (Vl(G.message), Ut(""));
    } finally {
      j.current && ut(!1);
    }
  }
  return /* @__PURE__ */ z.jsxs("section", { className: `mlb ${gl}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ z.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ z.jsxs("div", { children: [
        /* @__PURE__ */ z.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO / DADOS MUNICIPAIS" }),
        /* @__PURE__ */ z.jsx("h1", { children: "Monte sua camada" }),
        /* @__PURE__ */ z.jsx("p", { children: "Escolha os indicadores e receba uma camada vetorial com os atributos incorporados." })
      ] }),
      /* @__PURE__ */ z.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ z.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ z.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    st && /* @__PURE__ */ z.jsx("div", { className: "mlb-error", role: "alert", children: st }),
    zl ? /* @__PURE__ */ z.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ z.jsxs("main", { className: "mlb-panel", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ z.jsx("select", { value: Sl, onChange: (E) => {
              Zl(E.target.value), Nl("");
            }, children: cl.map((E) => /* @__PURE__ */ z.jsx("option", { children: E }, E)) })
          ] }),
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ z.jsx("select", { value: Ct ?? "", onChange: (E) => {
              fl(E.target.value), Nl("");
            }, children: nt.map((E) => /* @__PURE__ */ z.jsx("option", { children: E }, E)) })
          ] }),
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ z.jsxs("select", { value: yl, onChange: (E) => Nl(E.target.value), children: [
              /* @__PURE__ */ z.jsx("option", { value: "", children: "Todos os temas" }),
              s.map((E) => /* @__PURE__ */ z.jsx("option", { value: E, children: No(E) }, E))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ z.jsx("input", { type: "search", value: gt, placeholder: "Ex.: renda, população, IPDM…", onChange: (E) => Xl(E.target.value) })
          ] }),
          il.map(([E, G]) => /* @__PURE__ */ z.jsxs("label", { children: [
            E,
            /* @__PURE__ */ z.jsxs("select", { value: jl[E] ?? "", onChange: (Z) => $l({ ...jl, [E]: Z.target.value }), children: [
              /* @__PURE__ */ z.jsxs("option", { value: "", children: [
                "Todos (",
                G.length,
                ")"
              ] }),
              G.map((Z) => /* @__PURE__ */ z.jsx("option", { value: Z, children: Z }, Z))
            ] })
          ] }, E)),
          !!Object.values(jl).filter(Boolean).length && /* @__PURE__ */ z.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => $l({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ z.jsxs("span", { children: [
            U.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ z.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ z.jsx("button", { type: "button", disabled: !U.length || xl, onClick: () => B({ ...D, attributes: [.../* @__PURE__ */ new Set([...D.attributes, ...U.map((E) => E.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ z.jsx("button", { type: "button", disabled: !_.size || xl, onClick: () => B({ ...D, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-attributes", children: [
          Y.map((E) => /* @__PURE__ */ z.jsxs("article", { className: _.has(E.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ z.jsxs("label", { children: [
              /* @__PURE__ */ z.jsx("input", { type: "checkbox", checked: _.has(E.id), disabled: xl, onChange: () => Rt(E.id) }),
              /* @__PURE__ */ z.jsx("strong", { children: E.label })
            ] }),
            /* @__PURE__ */ z.jsxs("details", { children: [
              /* @__PURE__ */ z.jsx("summary", { "aria-label": `Fonte e definição de ${E.label}` }),
              /* @__PURE__ */ z.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ z.jsxs("p", { className: "mlb-detail-meta", children: [
                  No(E.theme),
                  " · ",
                  E.unit || "Unidade não informada",
                  " · ",
                  E.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ z.jsxs("p", { children: [
                  E.field,
                  " · ",
                  E.year
                ] }),
                /* @__PURE__ */ z.jsx("a", { href: E.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ z.jsx("p", { children: JSON.parse(E.detail).definicao || JSON.parse(E.detail).divulgacao || "" }),
                /* @__PURE__ */ z.jsx("p", { children: JSON.parse(E.detail).nota || "" })
              ] })
            ] })
          ] }, E.id)),
          !Y.length && /* @__PURE__ */ z.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ z.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ z.jsx("button", { type: "button", disabled: !Q, onClick: () => P(Q - 1), children: "Anterior" }),
          /* @__PURE__ */ z.jsxs("span", { children: [
            "Página ",
            Q + 1,
            " de ",
            Math.max(1, Math.ceil(U.length / 40))
          ] }),
          /* @__PURE__ */ z.jsx("button", { type: "button", disabled: (Q + 1) * 40 >= U.length, onClick: () => P(Q + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ z.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ z.jsx("strong", { children: D.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ z.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ z.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-basket", children: [
          R.map((E) => /* @__PURE__ */ z.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ z.jsx("span", { className: "mlb-basket-name", children: E.label }),
            /* @__PURE__ */ z.jsxs("details", { children: [
              /* @__PURE__ */ z.jsx("summary", { "aria-label": `Fonte e definição de ${E.label}` }),
              /* @__PURE__ */ z.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ z.jsxs("p", { className: "mlb-detail-meta", children: [
                  E.source,
                  " · ",
                  E.year
                ] }),
                /* @__PURE__ */ z.jsxs("p", { children: [
                  No(E.theme),
                  " · ",
                  E.unit || "Unidade não informada",
                  " · ",
                  E.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ z.jsx("p", { children: E.field })
              ] })
            ] }),
            /* @__PURE__ */ z.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: xl, title: `Remover ${E.label}`, "aria-label": `Remover ${E.label}`, onClick: () => Rt(E.id), children: "×" })
          ] }, E.id)),
          !R.length && /* @__PURE__ */ z.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ z.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ z.jsxs("select", { disabled: xl, value: D.format, onChange: (E) => B({ ...D, format: E.target.value }), children: [
            /* @__PURE__ */ z.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ z.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ z.jsx("option", { value: "shp", children: "Shapefile (.shp)" })
          ] })
        ] }),
        /* @__PURE__ */ z.jsxs("p", { className: "mlb-note", children: [
          D.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : D.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP."
        ] }),
        _.size > cd[D.format] && /* @__PURE__ */ z.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ z.jsx("button", { type: "button", className: "mlb-primary", disabled: xl || !_.size || _.size > cd[D.format], onClick: oe, children: xl ? "Gerando camada…" : tl ? "Gerar e baixar camada" : "Gerar camada" }),
        /* @__PURE__ */ z.jsx("p", { className: "mlb-status", role: "status", children: wt }),
        /* @__PURE__ */ z.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      Dl && /* @__PURE__ */ z.jsxs("section", { className: "mlb-panel mlb-preview", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "Prévia da tabela de atributos" }),
        /* @__PURE__ */ z.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
        /* @__PURE__ */ z.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ z.jsxs("table", { children: [
          /* @__PURE__ */ z.jsx("thead", { children: /* @__PURE__ */ z.jsxs("tr", { children: [
            /* @__PURE__ */ z.jsx("th", { children: "Código IBGE" }),
            /* @__PURE__ */ z.jsx("th", { children: "Município" }),
            Dl.fields.map((E) => /* @__PURE__ */ z.jsx("th", { children: E }, E))
          ] }) }),
          /* @__PURE__ */ z.jsx("tbody", { children: Dl.rows.map((E) => /* @__PURE__ */ z.jsxs("tr", { children: [
            /* @__PURE__ */ z.jsx("td", { children: E.CD_MUN }),
            /* @__PURE__ */ z.jsx("td", { children: E.NM_MUN }),
            Dl.fields.map((G) => /* @__PURE__ */ z.jsx("td", { children: E[G] == null ? "Sem valor" : E[G].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, G))
          ] }, E.CD_MUN)) })
        ] }) })
      ] })
    ] }) : /* @__PURE__ */ z.jsx("p", { role: "status", children: st ? "Não foi possível carregar o catálogo. Verifique a API configurada." : "Carregando catálogo…" })
  ] });
}
function Sh({ category: A, apiBase: el, onGenerated: V }) {
  const y = document.createElement("dialog");
  y.className = "ea-municipal-dialog";
  const nl = document.createElement("div");
  y.append(nl), document.body.append(y);
  const tl = rh.createRoot(nl);
  let gl = !1;
  const Ul = () => {
    gl || (tl.unmount(), y.close(), y.remove());
  };
  y.addEventListener("cancel", (_l) => {
    _l.preventDefault(), Ul();
  });
  function zl() {
    const [_l, x] = Hl.useState(""), [S, D] = Hl.useState(!1), Sl = Hl.useMemo(() => {
      let Ol;
      async function fl(yl, Nl, gt) {
        const Xl = await fetch(`${el}/extracao-atributos/municipal/${encodeURIComponent(A.id)}/${yl}`, {
          ...Nl ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Nl) } : {},
          signal: gt
        });
        if (!Xl.ok) {
          const jl = await Xl.json().catch(() => ({}));
          throw new Error(typeof jl.detail == "string" ? jl.detail : "Falha no gerador municipal.");
        }
        return yl === "export" ? (Ol = { arquivo: Xl.headers.get("X-Camada-Arquivo"), id: Xl.headers.get("X-Camada-Id") }, Xl.blob()) : Xl.json();
      }
      return {
        catalog: (yl) => fl("catalog", null, yl),
        preview: (yl, Nl) => fl("preview", yl, Nl),
        export: async (yl) => {
          gl = !0, D(!0);
          try {
            return await fl("export", { ...yl, nome: nl.querySelector('[name="municipal-name"]').value });
          } catch (Nl) {
            throw gl = !1, D(!1), Nl;
          }
        },
        generated: () => Ol
      };
    }, []);
    async function Zl() {
      try {
        await V(Sl.generated()), gl = !1, Ul();
      } finally {
        gl = !1, D(!1);
      }
    }
    return /* @__PURE__ */ z.jsxs(z.Fragment, { children: [
      /* @__PURE__ */ z.jsxs("header", { className: "ea-municipal-header", children: [
        /* @__PURE__ */ z.jsxs("div", { children: [
          /* @__PURE__ */ z.jsxs("h2", { children: [
            "Camada municipal · ",
            A.nome
          ] }),
          /* @__PURE__ */ z.jsx("p", { children: A.conceito })
        ] }),
        /* @__PURE__ */ z.jsx("button", { type: "button", "aria-label": "Fechar gerador municipal", disabled: S, onClick: Ul, children: "×" })
      ] }),
      /* @__PURE__ */ z.jsxs("label", { className: "ea-municipal-name", children: [
        "Nome da camada",
        /* @__PURE__ */ z.jsx("input", { name: "municipal-name", value: _l, disabled: S, maxLength: 200, placeholder: `${A.nome} — fonte majoritária da seleção — data da geração`, onChange: (Ol) => x(Ol.target.value) })
      ] }),
      /* @__PURE__ */ z.jsx("p", { className: "ea-municipal-help", children: "Escolha os atributos que representam esta categoria. Ao gerar, a camada será salva no acervo e adicionada às bases da análise." }),
      /* @__PURE__ */ z.jsx(gh, { client: Sl, download: !1, onExport: Zl })
    ] });
  }
  y.showModal(), tl.render(/* @__PURE__ */ z.jsx(zl, {}));
}
export {
  Sh as abrirMunicipal
};
