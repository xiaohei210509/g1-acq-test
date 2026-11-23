/*
 * g1-acq-test — 逐档验证「AI Pro / 2TB 卡片到底能被改成哪个真实 App Store 商品 ID」。
 * 与 g1-acq v7.5 同构：只对 one.google.com/ai? 的响应做文本替换，不查询商店。
 * 候选开关：Safari 打开 https://one.google.com/g1-test?cand=N（N 为下表下标）。
 */
"use strict";

(function () {
  var VERSION = "g1-acq-test-v1";
  var CAND_KEY = "g1.candidate.v1";
  var LOG_KEY = "g1.candidate.hits.v1";

  // 0/1 是本次实机采集到、确定存在的对照组；2 起是待验证的 90p 猜测。
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

  // 只改这四个采集到的完整源 ID：AI Pro 卡（月/年）与旧式 2TB 存储卡（月/年）。
  var SOURCES = [
    "g1.ios.ai.2tb.m.ip_3mo_75p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_25p.acq",
    "g1.ios.2tb.m.1month_ip_75p",
    "g1.ios.2tb.a.1year_ip_5p"
  ];

  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\//.test(url) ||
      /^https:\/\/one\.google\.com\/g1-test\/?(?:\?|$)/.test(url)) {
    $done({});
    return;
  }
  if (!/^https:\/\/one\.google\.com\/ai\?/.test(url)) {
    $done({});
    return;
  }

  var body = typeof $response === "object" && $response ? $response.body : undefined;
  if (typeof body !== "string") {
    $done({});
    return;
  }

  var index = 6; // 固定候选
  var target = CANDIDATES[index];
  // 先还原转义点号：v7.5 只对明文 g1. 生效，\u002e / \x2e 正文只采集、不改写。
  var out = body.replace(/\\u002e|\\x2e/g, ".");
  var counts = {};
  var hits = 0;
  SOURCES.forEach(function (source) {
    if (out.indexOf(source) === -1) return;
    var parts = out.split(source);
    var n = parts.length - 1;
    out = parts.join(target);
    counts[source] = n;
    hits += n;
  });

  if (hits) {
    try {
      $persistentStore.write(JSON.stringify({
        at: new Date().toISOString(),
        index: index,
        target: target,
        hits: hits,
        counts: counts
      }), LOG_KEY);
    } catch (error) {
      // 日志失败不影响改写
    }
  }

  console.log("[g1-acq-test] " + VERSION + " cand#" + index + " " + target +
    " hits=" + hits + " path=" + (url.indexOf("/ai?") > -1 ? "/ai" : url));
  $done(hits ? { body: out } : {});

  function readIndex() {
    try {
      var raw = $persistentStore.read(CAND_KEY);
      var n = parseInt(raw, 10);
      if (isFinite(n) && n >= 0 && n < CANDIDATES.length) return n;
    } catch (error) {
      // 默认 0
    }
    return 0;
  }
})();
