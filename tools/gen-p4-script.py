#!/usr/bin/env python3
"""Ndërton skedarin JavaScript që ekzekutohet brenda aplikacionit për provën A4.

Kufiri i afërsisë kohore zgjidhet mbi nëngrupin e kalibrimit dhe pastaj matet një herë
mbi nëngrupin e mbajtur mënjanë, që vlera e raportuar të mos jetë përshtatur mbi të
njëjtat të dhëna mbi të cilat raportohet.
"""
import json, os, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVAL = os.path.join(ROOT, "eval-data")
OUT = os.path.join(ROOT, "tools", "p4-holdout.js")

bal = json.load(io.open(os.path.join(EVAL, "p4-scenarios.json"), encoding="utf8"))["scenarios"]
con = json.load(io.open(os.path.join(EVAL, "p4-scenarios-conflict.json"), encoding="utf8"))["scenarios"]
split = json.load(io.open(os.path.join(EVAL, "p4-split.json"), encoding="utf8"))

scenarios = bal + con
by_id = {s["id"]: s for s in scenarios}
assert len(by_id) == 48

payload = {
    "scenarios": scenarios,
    "calibration": split["calibration"],
    "holdout": split["holdout"],
    "floors": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
}

js = """
var P = globalThis.PocketAI;
if (!P) throw new Error("globalThis.PocketAI mungon. A eshte ndertim Debug?");
var DATA = %s;

var WEIGHTS = function (floor) {
  return {
    sourceWeights: { document: 1.0, chat: 0.8, calendar: 0.6, health: 0.4 },
    recencyHalfLifeHours: 24 * 7,
    recencyFloor: floor,
  };
};

// Vektoret llogariten njehere dhe perdoren per te gjitha vlerat e kufirit, qe dallimet
// te vijne vetem nga kufiri dhe jo nga luhatje ne modelin e vektoreve semantike.
var texts = new Set();
DATA.scenarios.forEach(function (s) {
  texts.add(s.query);
  s.items.forEach(function (it) { texts.add(it.text); });
});
var list = Array.from(texts);

return P.EmbeddingService.load()
  .then(function () { return P.EmbeddingService.embedBatch(list); })
  .then(function (vecs) {
    var emb = new Map();
    list.forEach(function (t, i) { emb.set(t, vecs[i]); });
    var qemb = new Map();
    DATA.scenarios.forEach(function (s) { qemb.set(s.query, emb.get(s.query)); });

    var now = Date.now();
    var pick = function (ids) {
      return DATA.scenarios.filter(function (s) { return ids.indexOf(s.id) >= 0; });
    };
    var calSet = pick(DATA.calibration);
    var holdSet = pick(DATA.holdout);

    var run = function (set, floor) {
      var res = P.evaluatePrioritization(set, now, emb, qemb, WEIGHTS(floor));
      var out = {};
      res.metrics.forEach(function (m) {
        out[m.strategy] = {
          n: m.scenarios,
          selected: Math.round(m.goldSelectedRate * 1000) / 1000,
          first: Math.round(m.goldFirstRate * 1000) / 1000,
          meanRank: m.meanGoldRank === null ? null : Math.round(m.meanGoldRank * 1000) / 1000,
          byKindFirst: m.byKindFirst,
          byAge: m.byAge,
        };
      });
      return out;
    };

    var calibration = {};
    DATA.floors.forEach(function (f) { calibration[String(f)] = run(calSet, f); });

    // Vlera zgjidhet vetem mbi kalibrimin: renditja e pare, pastaj perfshirja, pastaj kufiri me i vogel.
    var best = null;
    DATA.floors.forEach(function (f) {
      var m = calibration[String(f)].pocketai;
      var k = [m.first, m.selected, -f];
      if (!best || k[0] > best.k[0]
          || (k[0] === best.k[0] && k[1] > best.k[1])
          || (k[0] === best.k[0] && k[1] === best.k[1] && k[2] > best.k[2])) {
        best = { floor: f, k: k };
      }
    });

    var holdoutSweep = {};
    DATA.floors.forEach(function (f) { holdoutSweep[String(f)] = run(holdSet, f).pocketai; });

    return {
      device: "iPhone 12 Pro",
      timestamp: new Date().toISOString(),
      nCalibration: calSet.length,
      nHoldout: holdSet.length,
      floors: DATA.floors,
      chosenFloor: best.floor,
      calibration: calibration,
      holdout: run(holdSet, best.floor),
      holdoutAtZero: run(holdSet, 0),
      holdoutSweep: holdoutSweep,
    };
  });
""" % json.dumps(payload, ensure_ascii=False)

io.open(OUT, "w", encoding="utf8").write(js)
print("U shkrua", OUT, "(%d KB)" % (len(js) // 1024))
