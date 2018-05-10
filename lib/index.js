exports.report = report;
exports.initialize = initialize;
exports.createReport = createReport;

var myVersion = "0.0.0"; // should match package.json
var initialized = false;
var uuidArray = new Uint8Array(16);
var crypto = window.crypto || window.msCrypto;
var pageStartTime = new Date();
var stackLineRe = /\s+at (.+) \((.+):(\d+):(\d+)\)/;

// populated in bt.initialize
var debugBacktrace;
var tabWidth;
var endpoint;
var token;
var userAttributes;
var contextLineCount;

function report(err, attributes, callback) {
  var report = createReport();
  if (err) report.setError(err);
  if (attributes) report.addObjectAttributes(attributes);
  report.send(callback);
}

function initialize(options) {
  options = options || {};

  debugBacktrace = !!options.debugBacktrace;
  tabWidth = options.tabWidth || 8;
  endpoint = options.endpoint;
  token = options.token;
  userAttributes = extend({}, options.attributes || {});
  contextLineCount = options.contextLineCount || 200;

  var disableGlobalHandler = !!options.disableGlobalHandler;
  var handlePromises = !!options.handlePromises;

  if (!endpoint) console.error(new Error("Backtrace: missing 'endpoint' option.").stack);
  if (!token) console.error(new Error("Backtrace: missing 'token' option.").stack);

  if (!disableGlobalHandler) {
    registerGlobalHandler();
  }
  if (handlePromises) {
    registerPromiseHandler();
  }

  initialized = true;
}

function registerGlobalHandler() {
  window.addEventListener('error', onGlobalError, false);

  function onGlobalError(ev) {
    if (ev.error) {
      report(ev.error);
    } else {
      report(new Error(ev.message || "unknown"));
    }
  }
}

function registerPromiseHandler() {
  window.addEventListener('unhandledrejection', onGlobalPromiseRejected, false);

  function onGlobalPromiseRejected(ev) {
    report(ev.reason);
  }
}

function createReport() {
  return new BacktraceReport();
}

function BacktraceReport() {
  if (!initialized) throw new Error("Must call bt.initialize first");
  this.report = {
    uuid: makeUuid(),
    timestamp: getTimestamp(),
    lang: "js",
    langVersion: navigator.userAgent,
    agent: "backtrace-js",
    agentVersion: myVersion,
    attributes: extend({
      "process.age": getUptime(),
      "user.agent": navigator.userAgent,
    }, userAttributes),
    annotations: {},
    tabWidth: tabWidth,
  };
  this.logLines = [];
}

BacktraceReport.prototype.setError = function(err) {
  if (!validateErrorObject(err)) return;

  this.report.classifiers = [err.name];
  this.report.attributes['error.message'] = err.message;
  this.report.sourceCode = {};

  // parse stack
  var lines = err.stack.split("\n").slice(1);
  var stackArray = [];
  var wantedSourceCode = {};
  var sourceCodePath;
  for (var i = 0; i < lines.length; i += 1) {
    var rawLine = lines[i];
    var match = rawLine.match(stackLineRe);
    if (!match) continue;

    var funcName = match[1];
    sourceCodePath = match[2];
    var line = parseInt(match[3], 10);
    var column = parseInt(match[4], 10);
    wantedSourceCode[sourceCodePath] = wantedSourceCode[sourceCodePath] || [];
    wantedSourceCode[sourceCodePath].push({line: line, column: column});

    var frame = {
      funcName: funcName,
      line: line,
      column: column,
      sourceCode: sourceCodePath,
      library: sourceCodePath,
    };
    stackArray.push(frame);
  }

  this.report.threads = {
    main: {
      stack: stackArray,
    },
  };
  this.report.mainThread = "main";

  for (sourceCodePath in wantedSourceCode) {
    this.report.sourceCode[sourceCodePath] = {
      path: sourceCodePath,
    };
  }
};

function makeFullUrl(endpoint, path, query) {
  var queryString = "?";
  var first = true;
  for (var key in query) {
    if (!first) queryString += "&";
    first = false;
    queryString += encodeURIComponent(key) + "=" + encodeURIComponent(query[key]);
  }
  return endpoint + path + queryString;
}

BacktraceReport.prototype.send = function(callback) {
  finishReport(this);

  var reportedError = false;
  var postString = JSON.stringify(this.report);
  var query = {token: token, format: 'json'};
  var fullUrl = makeFullUrl(endpoint, "/post", query);
  var req = new XMLHttpRequest();

  req.addEventListener('readystatechange', onReadyStateChange, false);
  req.addEventListener('error', onErrorEvent, false);
  req.open('POST', fullUrl);
  req.setRequestHeader('Content-Type', 'text/plain');
  req.send(postString);

  function onReadyStateChange() {
    if (req.readyState !== 4) return;
    if (req.status === 200 && callback) return callback();
    reportError(new Error(req.responseText));
  }

  function reportError(err) {
    if (reportedError) return;
    reportedError = true;
    if (callback) {
      callback(err);
    } else if (debugBacktrace) {
      console.error("Unable to send error report:", err.stack);
    }
  }
 
  function onErrorEvent(ev) {
    reportError(new Error("request failed"));
  }
};

BacktraceReport.prototype.addAttribute = function(key, value) {
  if (!isValidAttr(value)) {
    console.error(new Error("Attempted to add attribute with invalid type '" +
      typeof(value) + "'").stack);
    return;
  }
  this.report.attributes[key] = value;
};

BacktraceReport.prototype.addObjectAttributes = function(object, options) {
  options = options || {};
  var prefix = options.prefix || "";
  var allowPrivateProps = !!options.allowPrivateProps;
  addAttrs(this.report.attributes, new Set(), prefix, object, allowPrivateProps);
};

BacktraceReport.prototype.log = function() {
  var msg = "";
  for (var i = 0; i < arguments.length; i += 1) {
    var arg = arguments[i];
    if (i !== 0) msg += " ";
    msg += String(arg);
  }
  this.logLines.push({
    ts: new Date(),
    msg: msg,
  });
};

BacktraceReport.prototype.addAnnotation = function(key, value) {
  if (typeof(key) !== 'string') {
    console.error(new Error("Attempted to add annotation with non-string key").stack);
    return;
  }
  // We serialize to JSON and then deserialize here for two reasons:
  // 1. To verify that it will work since we need it to be JSON later.
  // 2. In case fields or elements of value change later, we get a snapshot
  //    of right now and use that.
  var jsonValue;
  try {
    jsonValue = JSON.stringify(value);
  } catch (err) {
    console.error(new Error("Attempted to add annotation which could not be JSON serialized: " +
      err.message).stack);
    return;
  }
  this.report.annotations[key] = JSON.parse(jsonValue);
};

function finishReport(self) {
  if (self.logLines.length !== 0 && self.report.annotations.Log == null) {
    self.report.annotations.Log = self.logLines;
  }
}

function validateErrorObject(err) {
  if (err instanceof Error) return true;
  console.error(new Error("Attempted to report error with non Error type").stack);
  return false;
}

function makeUuid() {
  crypto.getRandomValues(uuidArray);
  var result = "";
  var i = 0;
  for (; i < 4; i += 1) result += hexStr(uuidArray[i]);
  result += "-";
  for (; i < 6; i += 1) result += hexStr(uuidArray[i]);
  result += "-";
  for (; i < 8; i += 1) result += hexStr(uuidArray[i]);
  result += "-";
  for (; i < 10; i += 1) result += hexStr(uuidArray[i]);
  result += "-";
  for (; i < 16; i += 1) result += hexStr(uuidArray[i]);
  return result;
}

function hexStr(b) {
  var s = b.toString(16);
  return (b < 0x10) ? ("0" + s) : s;
}

function getTimestamp() {
  return Math.floor((new Date()).getTime() / 1000)
}

function getUptime() {
  return Math.floor((new Date() - pageStartTime) / 1000);
}

function extend(o, src) {
  for (var key in src) o[key] = src[key];
  return o;
}

function isValidAttr(value) {
    return (typeof(value) === 'string' ||
            typeof(value) === 'boolean' ||
            typeof(value) === 'number');
}

function addAttrs(attributes, seenObjs, prefix, obj, allowPrivateProps) {
  if (seenObjs.has(obj)) return;
  seenObjs.add(obj);

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    if (!allowPrivateProps && key[0] === '_') continue;
    var value = obj[key];
    if (isValidAttr(value)) {
      attributes[prefix + key] = value;
    } else if (!Array.isArray(value) && typeof(value) === 'object') {
      addAttrs(attributes, seenObjs, key + ".", value, allowPrivateProps);
    }
  }
}

