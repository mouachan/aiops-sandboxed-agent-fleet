// Incident Lab bench: runs the whole Incident Lab (deploy → inject fault → investigate → fix) on
// several attendees at the same time, through each attendee's own workshop API, and reports how
// long the fleet took and whether it found the root cause. Run by scripts/lab-bench.sh as a Job.
//
// Env: TARGETS_FILE (lines "user<TAB>https://workshop-…/<TAB>access-token"), STAGGER_MS (delay
// between attendees, default 0 = all at once), INVESTIGATE_TIMEOUT_MS (default 600000).
import { readFileSync } from "node:fs";

const targets = readFileSync(process.env.TARGETS_FILE || "/bench/targets.tsv", "utf8")
  .split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [user, base, token] = l.split("\t");
    return { user, base: base.replace(/\/+$/, ""), token };
  });
const STAGGER = Number(process.env.STAGGER_MS || 0);
const INVESTIGATE_TIMEOUT = Number(process.env.INVESTIGATE_TIMEOUT_MS || 600_000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();

async function api(t, path, body, timeoutMs = 120_000) {
  const r = await fetch(t.base + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${t.token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (!r.ok && !json) throw new Error(`${path}: HTTP ${r.status} ${text.slice(0, 120)}`);
  return json ?? {};
}

async function waitFor(t, pred, timeoutMs, label) {
  const end = now() + timeoutMs;
  let h = {};
  while (now() < end) {
    try { h = await api(t, "/api/incident"); if (pred(h)) return h; } catch { /* transient */ }
    await sleep(5000);
  }
  throw new Error(`${label}: timeout after ${Math.round(timeoutMs / 1000)}s (last: ${JSON.stringify(h).slice(0, 160)})`);
}

// Investigate exactly like the Incident Lab page: POST /api/orchestrate, read the NDJSON stream.
async function investigate(t, ns) {
  const task = `The 'shop' service in namespace ${ns} is failing a high rate of requests. Investigate from metrics, logs, traces and events, and find the root cause.`;
  const r = await fetch(t.base + "/api/orchestrate", {
    method: "POST",
    headers: { Authorization: `Bearer ${t.token}`, "content-type": "application/json" },
    body: JSON.stringify({ task }),
    signal: AbortSignal.timeout(INVESTIGATE_TIMEOUT),
  });
  if (!r.ok || !r.body) throw new Error(`orchestrate: HTTP ${r.status}`);
  const out = { steps: {}, retries: 0, answer: "", synthesizedBy: "", error: "" };
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (e.type === "step" && e.status === "done") out.steps[e.agent] = { ms: e.ms, out: String(e.out || "").slice(0, 300) };
      if ((e.type === "step" || e.type === "writer") && e.status === "retry") out.retries++;
      if (e.type === "answer") { out.answer = String(e.answer || ""); out.synthesizedBy = e.synthesizedBy || ""; }
      if (e.type === "error") out.error = String(e.error || "error");
    }
  }
  return out;
}

// Right root cause: the analyst names the payments dependency and its outage / scale-down.
const correct = (a) => /payments/i.test(a) && /(scal|replica|down|unavailable|outage|no ready|0\b)/i.test(a);

async function runOne(t, idx) {
  await sleep(idx * STAGGER);
  const res = { user: t.user, ok: false, phase: "", times: {} };
  const mark = (k, t0) => { res.times[k] = Math.round((now() - t0) / 1000); };
  try {
    let t0 = now(); res.phase = "prepare";
    let h = await api(t, "/api/incident");
    if (!h.exists) { await api(t, "/api/incident", { action: "deploy" }, 300_000); h = await waitFor(t, (x) => x.exists && x.healthy, 300_000, "deploy"); }
    else if (!h.healthy) { await api(t, "/api/incident", { action: "fix" }); h = await waitFor(t, (x) => x.healthy, 240_000, "pre-fix"); }
    mark("prepare", t0);

    t0 = now(); res.phase = "break";
    await api(t, "/api/incident", { action: "break" });
    // the page enables "Investigate" once the app is unhealthy; give the telemetry a moment too
    h = await waitFor(t, (x) => x.paymentsUp === false && (x.errorRps || 0) > 0, 240_000, "break");
    await sleep(20_000);
    mark("break", t0);

    t0 = now(); res.phase = "investigate";
    const inv = await investigate(t, h.ns);
    mark("investigate", t0);
    res.retries = inv.retries;
    res.synthesizedBy = inv.synthesizedBy;
    res.agents = Object.fromEntries(Object.entries(inv.steps).map(([a, s]) => [a, Math.round((s.ms || 0) / 1000)]));
    res.correct = !inv.error && correct(inv.answer);
    res.answer = inv.error ? `ERROR: ${inv.error}` : inv.answer.replace(/\s+/g, " ").slice(0, 240);

    t0 = now(); res.phase = "fix";
    await api(t, "/api/incident", { action: "fix" });
    await waitFor(t, (x) => x.healthy, 300_000, "fix");
    mark("fix", t0);
    res.ok = !inv.error; res.phase = "done";
  } catch (e) {
    res.error = `${res.phase}: ${e.message}`;
    // never leave an attendee's app broken
    try { await api(t, "/api/incident", { action: "fix" }); } catch { /* best effort */ }
  }
  console.log("RESULT " + JSON.stringify(res));
  return res;
}

const pct = (arr, p) => { if (!arr.length) return "-"; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const t0 = now();
console.log(`bench: ${targets.length} attendee(s), stagger ${STAGGER} ms`);
const results = await Promise.all(targets.map((t, i) => runOne(t, i)));
const inv = results.filter((r) => r.times?.investigate !== undefined).map((r) => r.times.investigate);
const summary = {
  attendees: results.length,
  completed: results.filter((r) => r.ok).length,
  correctRootCause: results.filter((r) => r.correct).length,
  failed: results.filter((r) => !r.ok).map((r) => `${r.user}: ${r.error || r.answer}`),
  investigateSeconds: { p50: pct(inv, 0.5), p95: pct(inv, 0.95), max: pct(inv, 1) },
  retries: results.reduce((a, r) => a + (r.retries || 0), 0),
  evidenceCheckOnly: results.filter((r) => r.synthesizedBy === "evidence-check").length,
  wallSeconds: Math.round((now() - t0) / 1000),
};
console.log("SUMMARY " + JSON.stringify(summary));
