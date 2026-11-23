/* g1-acq-test 本地页：切换候选、看上一次改写命中。 */
"use strict";

(function () {
  var CAND_KEY = "g1.candidate.v1";
  var LOG_KEY = "g1.candidate.hits.v1";
  var CANDIDATES = [
    "g1.ios.ai.2tb.m.ip_3mo_75p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_25p.acq",
    "g1.ios.ai.2tb.m.ip_12mo_90p.acq",
    "g1.ios.ai.2tb.m.ip_1yr_90p.acq",
    "g1.ios.ai.2tb.m.12months_ip_90p.acq",
    "g1.ios.2tb.m.12months_ip_90p",
    "g1.2tb.ai.12months_ip_90p",
    "g1.ios.ai.2tb.m.ip_12mo_75p.acq",
    "g1.ios.ai.2tb.m.ip_3mo_90p.acq"
  ];
  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\/g1-test\/?(?:\?|$)/.test(url)) {
    $done({});
    return;
  }

  var current = readInt(CAND_KEY, 0);
  var wanted = /[?&]cand=(\d+)/.exec(url);
  if (wanted) {
    var n = parseInt(wanted[1], 10);
    if (isFinite(n) && n >= 0 && n < CANDIDATES.length) {
      $persistentStore.write(String(n), CAND_KEY);
      current = n;
    }
  }
  var log = {};
  try {
    log = JSON.parse($persistentStore.read(LOG_KEY) || "{}");
  } catch (error) {
    log = {};
  }

  if (/[?&]format=json/.test(url)) {
    $done({
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ current: current, target: CANDIDATES[current], candidates: CANDIDATES, last: log }, null, 2)
    });
    return;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var rows = CANDIDATES.map(function (id, i) {
    var mark = i === current ? "<b>已选</b>" : "<a href=\"/g1-test?cand=" + i + "\">选用</a>";
    return "<tr><td>" + i + "</td><td><code>" + esc(id) + "</code></td><td>" + mark + "</td></tr>";
  }).join("");

  var lastHtml = log && log.target
    ? "<p>上次改写：" + esc(log.at) + "<br>候选 #" + esc(log.index) + " → <code>" + esc(log.target) +
      "</code><br>命中 " + esc(log.hits) + " 处：" + esc(JSON.stringify(log.counts)) + "</p>"
    : "<p>还没有捕获到可改写的响应。</p>";

  $done({
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
      "<title>G1 ACQ TEST</title><style>body{font:15px -apple-system;margin:16px}" +
      "td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}code{font-size:12px}</style>" +
      "<h3>G1 ACQ TEST</h3><p>当前候选 #" + current + "：<code>" + esc(CANDIDATES[current]) + "</code></p>" +
      lastHtml +
      "<p>选好候选后回到 Google App 重新进入 AI Pro 卡，看收银台的名称/周期/金额。一次只测一个候选。</p>" +
      "<table>" + rows + "</table>" +
      "<p><a href=\"/g1-test?format=json\">JSON</a></p>"
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
