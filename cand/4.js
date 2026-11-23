/*
 * g1-acq-test v2 — 逐档验证「AI Pro 卡片能被改成哪个真实 App Store 商品 ID」。
 * 只对 one.google.com/ai? 的响应做文本替换，不查询商店。
 * 顺带把本次命中写成原报告脚本认识的记录，可在 /g1-sku-report 里看到。
 */
"use strict";

(function () {
  var VERSION = "g1-acq-test-v4";
  var CAND_KEY = "g1.candidate.v1";
  var LOG_KEY = "g1.candidate.hits.v1";
  var TEST_KEY = "g1.pro.annual.test.v1";
  var RAW_KEY = "g1.last.body.v1";

  // 0/1 = 实机采集到的 5TB 原生对照；2 起为「5TB 档 90p/12 个月」的各种真实命名猜测。
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

  // 只改这四个采集到的完整源 ID：AI Pro 卡（月/年）与旧式 2TB 存储卡（月/年）。
  var SOURCES = [
    "g1.ios.ai.2tb.m.ip_3mo_75p.acq",
    "g1.ios.ai.2tb.a.ip_1yr_25p.acq",
    "g1.ios.2tb.m.1month_ip_75p",
    "g1.ios.2tb.a.1year_ip_5p"
  ];

  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\//.test(url) ||
      /^https:\/\/one\.google\.com\/(?:g1-test|g1-sku-report)\/?(?:\?|$)/.test(url)) {
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

  var index = 4; // 固定候选
  var target = CANDIDATES[index];
  var now = new Date().toISOString();
  // 先还原转义点号：v7.5 只对明文 g1. 生效，\u002e / \x2e 正文只采集、不改写。
  var out = body.replace(/\\u002e|\\x2e/g, ".");
  // 这条响应里究竟有没有 AI Pro 卡自己的编号：没有就说明我们改的不是购买链路。
  var sawAi = (out.match(/g1\.ios\.ai\.2tb\./g) || []).length;
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

  if (hits || sawAi) {
    write(RAW_KEY, out.slice(0, 250000));
    write(LOG_KEY, JSON.stringify({ at: now, index: index, target: target, hits: hits, sawAi: sawAi, bytes: out.length, counts: counts }));
    write(TEST_KEY, JSON.stringify({
      schemaVersion: 1,
      version: VERSION,
      updatedAt: now,
      sourcePrefix: "g1.ios.2tb.",
      target: target,
      targetOrigin: "user-specified",
      hitCount: hits,
      annualHitCount: hits,
      matchedFrom: Object.keys(counts).map(function (source) {
        return { id: source, to: target, count: counts[source], fallback: false };
      }),
      status: "rewritten"
    }));
  }

  console.log("[g1-acq-test] " + VERSION + " cand#" + index + " " + target + " hits=" + hits + " sawAi=" + sawAi);
  $done(hits ? { body: out } : {});

  function readIndex() {
    try {
      var n = parseInt($persistentStore.read(CAND_KEY), 10);
      if (isFinite(n) && n >= 0 && n < CANDIDATES.length) return n;
    } catch (error) {
      // 默认 0
    }
    return 0;
  }

  function write(key, value) {
    try {
      $persistentStore.write(value, key);
    } catch (error) {
      // 存储失败不影响改写
    }
  }
})();
