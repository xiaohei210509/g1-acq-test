/* g1-switch v2 — 候选开关与本机页。cand=N 可挂在任意 one.google.com 地址上。 */
"use strict";

(function () {
  var CAND_KEY = "g1.candidate.v1";
  var LOG_KEY = "g1.candidate.hits.v1";
  // 0/1 = 实机采集到的 5TB 原生对照；2 起为「5TB 档 90p/12 个月」的命名猜测。
  var CANDIDATES = [
    "g1.ios.ai.2tb.m.ip_3mo_75p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_25p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_90p.acq",
    "g1.ios.ai.2tb.m.ip_12mo_90p.acq",
    "g1.ios.ai.2tb.m.ip_1yr_90p.acq",
    "g1.ios.ai.2tb.m.12months_ip_90p.acq",
    "g1.ios.ai.2tb.m.ip_12mo_10p.acq",
    "g1.ios.ai.2tb.m.ip_12mo_75p.acq",
    "g1.ios.ai.2tb.m.ip_3mo_90p.acq",
    "g1.ios.2tb.m.12months_ip_90p",
    "g1.2tb.ai.12months_ip_90p"
  ];
  // 1 = 5TB(AI Pro) 档，0 = 存储 2TB 档。标题会跟着变，选的时候看这一列。
  var LABELS = ["5TB", "5TB", "5TB", "5TB", "5TB", "5TB", "5TB", "5TB", "5TB", "存储", "存储"];
  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\//.test(url)) {
    $done({});
    return;
  }

  var wanted = /[?&]cand=(\d{1,2})(?:&|$)/.exec(url);
  var setIndex = null;
  if (wanted) {
    var n = parseInt(wanted[1], 10);
    if (isFinite(n) && n >= 0 && n < CANDIDATES.length) {
      try {
        $persistentStore.write(String(n), CAND_KEY);
        setIndex = n;
      } catch (error) {
        setIndex = null;
      }
    }
  }

  if (!/^https:\/\/one\.google\.com\/g1-test\/?(?:\?|$)/.test(url)) {
    $done({});
    return;
  }

  var current = setIndex === null ? readInt(CAND_KEY, 0) : setIndex;
  var log = {};
  try {
    log = JSON.parse($persistentStore.read(LOG_KEY) || "{}");
  } catch (error) {
    log = {};
  }
  var headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };

  if (/[?&]raw=1/.test(url)) {
    var raw = "";
    try {
      raw = $persistentStore.read("g1.last.body.v1") || "";
    } catch (error) {
      raw = "";
    }
    headers["Content-Type"] = "text/plain; charset=utf-8";
    $done({ response: { status: 200, headers: headers, body: raw || "(暂无抓取)" } });
    return;
  }
  if (/[?&]clear=1/.test(url)) {
    try {
      $persistentStore.write("{}", LOG_KEY);
      $persistentStore.write("", "g1.last.body.v1");
    } catch (error) {
      // 忽略
    }
  }

  if (/[?&]format=json/.test(url)) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    $done({
      response: {
        status: 200,
        headers: headers,
        body: JSON.stringify({ current: current, target: CANDIDATES[current], candidates: CANDIDATES, last: log }, null, 2)
      }
    });
    return;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var rows = CANDIDATES.map(function (id, i) {
    var mark = i === current ? "<b>已选</b>" : "<a href=\"/g1-test?cand=" + i + "\">选用</a>";
    return "<tr><td>" + i + "</td><td>" + esc(LABELS[i]) + "</td><td><code>" + esc(id) +
      "</code></td><td>" + mark + "</td></tr>";
  }).join("");
  var lastHtml = log && log.target
    ? "<p>上次改写 " + esc(log.at) + "：候选 #" + esc(log.index) + " → <code>" + esc(log.target) +
      "</code><br>命中 " + esc(log.hits) + " 处，AI 编号出现 " + esc(log.sawAi || 0) + " 次 " +
      esc(JSON.stringify(log.counts)) + "</p>"
    : "<p>还没有捕获到可改写的响应。</p>";

  $done({
    response: {
      status: 200,
      headers: headers,
      body: "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
        "<title>G1 ACQ TEST</title><style>body{font:15px -apple-system;margin:16px;color:#1c2737}" +
        "td{padding:5px 6px;border-bottom:1px solid #eee;vertical-align:top}code{font-size:12px;overflow-wrap:anywhere}" +
        "a{color:#1259be}</style><h3>G1 ACQ TEST</h3>" +
        "<p>要开的是「Google AI Pro (5 TB)」那张卡；5TB 候选改完标题仍是 5TB，只有指到存储档才会变 Google One。</p>" +
        "<p>当前候选 #" + current + "：<code>" + esc(CANDIDATES[current]) + "</code></p>" + lastHtml +
        "<p>选好后回 Google App 重新进入 AI Pro 卡，核对收银台名称/周期/金额。一次只测一个候选。</p><table>" +
        rows + "</table><p><a href=\"/g1-sku-report\">→ 原版报告</a> · <a href=\"/g1-test?format=json\">JSON</a> · <a href=\"/g1-test?raw=1\">原始响应</a> · <a href=\"/g1-test?clear=1\">清空</a></p>"
    }
  });

  function readInt(key, fallback) {
    try {
      var n = parseInt($persistentStore.read(key), 10);
      if (isFinite(n) && n >= 0 && n < CANDIDATES.length) return n;
    } catch (error) {
      return fallback;
    }
    return fallback;
  }
})();
