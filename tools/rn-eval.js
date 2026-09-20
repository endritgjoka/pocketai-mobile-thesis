#!/usr/bin/env node
/**
 * Ekzekuton kod brenda aplikacionit PocketAI përmes Hermes inspector-it të Metro-s.
 *
 * Përdorim:  node tools/rn-eval.js <skedar.js> [sekonda]
 * Skedari vlerësohet brenda aplikacionit dhe duhet të kthejë një Promise ose një vlerë.
 * Rezultati kthehet si JSON në stdout.
 */
const fs = require("fs");
const WebSocket = require("ws");

const METRO = process.env.METRO || "http://localhost:8081";
const file = process.argv[2];
const timeoutSec = Number(process.argv[3] || 600);
if (!file) { console.error("Jep një skedar .js për t'u ekzekutuar."); process.exit(1); }
const source = fs.readFileSync(file, "utf8");

(async () => {
  const res = await fetch(`${METRO}/json/list`);
  const targets = await res.json();
  const target = targets.find((t) => t.webSocketDebuggerUrl && /Hermes|React|Experimental/i.test(t.title || ""))
              || targets.find((t) => t.webSocketDebuggerUrl);
  if (!target) { console.error("Asnjë objektiv i lidhur me Metro. A është ngarkuar aplikacioni?"); process.exit(2); }
  console.error("objektivi:", target.title, "|", target.deviceName);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });

  await new Promise((r) => ws.on("open", r));
  await send("Runtime.enable", {});

  // Hermes nuk i mbeshtet funksionet async ne kodin e vleresuar drejtpersedrejti,
  // prandaj skedari duhet te kthejë vetë një Promise dhe nuk perdor await.
  //
  // Promise-i i React Native eshte polyfill dhe nuk njihet nga `awaitPromise` i CDP-se,
  // prandaj rezultati ruhet ne nje ndryshore globale dhe lexohet me vone me votim.
  const starter = `globalThis.__EVAL_OUT = null; (function () { ${source} })()`
    + `.then(function (v) { globalThis.__EVAL_OUT = { ok: true, v: v }; },`
    + ` function (e) { globalThis.__EVAL_OUT = { ok: false, e: String((e && e.stack) || e) }; }); "nisur"`;

  const started = await send("Runtime.evaluate", { expression: starter, returnByValue: true });
  if (started.exceptionDetails) {
    console.error("GABIM NE NISJE:", JSON.stringify(started.exceptionDetails, null, 2));
    process.exit(3);
  }

  const deadline = Date.now() + timeoutSec * 1000;
  let payload = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const probe = await send("Runtime.evaluate", {
      expression: "globalThis.__EVAL_OUT ? JSON.stringify(globalThis.__EVAL_OUT) : null",
      returnByValue: true,
    });
    const raw = probe.result && probe.result.value;
    if (raw) { payload = JSON.parse(raw); break; }
    process.stderr.write(".");
  }
  ws.close();
  process.stderr.write("\n");

  if (!payload) { console.error("Skadoi koha pa rezultat."); process.exit(5); }
  if (!payload.ok) { console.error("GABIM NE PAJISJE:", payload.e); process.exit(3); }
  const result = { result: { value: payload.v } };

  process.stdout.write(JSON.stringify(result.result.value, null, 2) + "\n");
})().catch((e) => { console.error(e); process.exit(4); });
