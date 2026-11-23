/* g1-switch v5 — 候选开关、发现列表与本机页。cand=N / d=N 可挂在任意 one.google.com 地址上。 */
"use strict";

(function () {
  var CAND_KEY = "g1.candidate.v1";
  var OVER_KEY = "g1.override.v1";
  var LOG_KEY = "g1.candidate.hits.v1";
  var FOUND_KEY = "g1.found.v1";
  var CANDIDATES = [
    "g1.ios.ai.2tb.m.ip_3mo_90p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_25p.acq",
    "g1.ios.ai.2tb.m.ip_6mo_90p.acq",
    "g1.ios.ai.2tb.m.ip_9mo_90p.acq",
    "g1.ios.ai.2tb.m.ip_12mo_90p.acq",
    "g1.ios.ai.2tb.m.12mo_90p.acq",
    "g1.ios.ai.2tb.m.ip_12m_90p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_90p.acq",
    "g1.ios.ai.2tb.m.ip_12mo_10p.acq",
    "g1.ios.ai.2tb.m.ip_6mo_75p.acq",
    "g1.ios.ai.2tb.m.ip_3mo_75p.acq",
    "g1.ios.2tb.m.12months_ip_90p",
    "g1.2tb.ai.12months_ip_90p"
  ];
  var LABELS = ["✅90p3mo", "✅25p1yr", "6mo", "9mo", "12mo", "12mo", "12m", "1yr", "10p", "6mo75", "原生", "存储", "存储"];

  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\//.test(url)) {
    $done({});
    return;
  }

  function put(key, value) {
    try {
      $persistentStore.write(value, key);
    } catch (error) {
      // 忽略
    }
  }
  function get(key) {
    try {
      return $persistentStore.read(key) || "";
    } catch (error) {
      return "";
    }
  }

  var candHit = /[?&]cand=(\d{1,2})(?:&|$)/.exec(url);
  if (candHit) {
    var n = parseInt(candHit[1], 10);
    if (isFinite(n) && n >= 0 && n < CANDIDATES.length) {
      put(CAND_KEY, String(n));
      put(OVER_KEY, "");
    }
  }
  if (/[?&]dclear=1/.test(url)) put(OVER_KEY, "");

  if (!/^https:\/\/one\.google\.com\/g1-test\/?(?:\?|$)/.test(url)) {
    $done({});
    return;
  }

  var found = [];
  try {
    found = JSON.parse(get(FOUND_KEY) || "[]");
  } catch (error) {
    found = [];
  }
  if (!Array.isArray(found)) found = [];
  var foundHit = /[?&]d=(\d{1,3})(?:&|$)/.exec(url);
  if (foundHit) {
    var o = parseInt(foundHit[1], 10);
    if (isFinite(o) && o >= 0 && o < found.length) put(OVER_KEY, found[o]);
  }
  if (/[?&]clear=1/.test(url)) {
    put(LOG_KEY, "{}");
    put("g1.last.body.v1", "");
    put(FOUND_KEY, "[]");
  }

  var current = 0;
  var p = parseInt(get(CAND_KEY), 10);
  if (isFinite(p) && p >= 0 && p < CANDIDATES.length) current = p;
  var override = get(OVER_KEY);
  var target = /^g1\.[A-Za-z0-9._-]{3,80}$/.test(override) ? override : CANDIDATES[current];

  var headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };

  if (/[?&]raw=1/.test(url)) {
    headers["Content-Type"] = "text/plain; charset=utf-8";
    $done({ response: { status: 200, headers: headers, body: get("g1.last.body.v1") || "(暂无抓取)" } });
    return;
  }
  if (/[?&]format=json/.test(url)) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    $done({
      response: {
        status: 200,
        headers: headers,
        body: JSON.stringify({ current: current, override: override, target: target, candidates: CANDIDATES, found: found }, null, 2)
      }
    });
    return;
  }

  var log = {};
  try {
    log = JSON.parse(get(LOG_KEY) || "{}");
  } catch (error) {
    log = {};
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var rows = CANDIDATES.map(function (id, i) {
    var mark = !override && i === current ? "<b>已选</b>" : "<a href=\"/g1-test?cand=" + i + "\">选用</a>";
    return "<tr><td>" + i + "</td><td class=n>" + esc(LABELS[i]) + "</td><td><code>" + esc(id) +
      "</code></td><td>" + mark + "</td></tr>";
  }).join("");
  var foundRows = found.length ? found.map(function (id, i) {
    var hot = /_90p|12mo|1yr/.test(id) ? " class=h" : "";
    return "<tr" + hot + "><td>" + i + "</td><td><code>" + esc(id) +
      "</code></td><td><a href=\"/g1-test?d=" + i + "\">试</a></td></tr>";
  }).join("") : "<tr><td colspan=3 class=n>还没抓到响应，先去 App 里打开一次方案页。</td></tr>";
  var lastHtml = log && log.target
    ? "<p class=n>上次改写 " + esc(log.at) + "：<br><code>" + esc(log.target) + "</code><br>命中 " +
      esc(log.hits) + " 处，AI 编号出现 " + esc(log.sawAi || 0) + " 次</p>"
    : "";

  $done({
    response: {
      status: 200,
      headers: headers,
      body: "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
        "<title>G1 ACQ TEST</title><style>body{font:14px -apple-system;margin:14px;color:#1c2737}" +
        "td{padding:5px;border-bottom:1px solid #eee;vertical-align:top}code{font-size:11px;overflow-wrap:anywhere}" +
        "a{color:#1259be}.n{color:#68758a}.h{background:#fffbe6}</style><h3>G1 ACQ TEST</h3>" +
        "<p>点的一直是<b>Google AI Pro (5 TB)</b> 那张卡。选完后退出 Google One 再重进。</p>" +
        "<p>当前目标：" + (override ? "<b>覆盖</b> " : "") + "<code>" + esc(target) + "</code>" +
        (override ? " · <a href=\"/g1-test?dclear=1\">清除覆盖</a>" : "") + "</p>" + lastHtml +
        "<h4>页面里出现的编号（点“试”直接用它）</h4><table>" + foundRows + "</table>" +
        "<h4>手动候选</h4><table>" + rows + "</table>" +
        "<p><a href=\"/g1-sku-report\">原版报告</a> · <a href=\"/g1-test?format=json\">JSON</a> · " +
        "<a href=\"/g1-test?raw=1\">原始响应</a> · <a href=\"/g1-test?clear=1\">清空</a></p>"
    }
  });
})();
