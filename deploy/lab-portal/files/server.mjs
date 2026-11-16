// Lab portal — self-service sign-up for the multi-attendee lab (scripts/lab.sh portal).
//
// An attendee scans the QR code on their table, enters their email and the event code, and gets
// the next free environment (userNN) with all its links. The same email always gets the same
// environment back. Assignments live in one ConfigMap (in-cluster) or a JSON file (tests, local
// runs). Zero dependencies: runs on a stock Node 24 image, the code is mounted from a ConfigMap.
//
// Env: PORT (8080), PORTAL_ATTENDEES_CSV (content of .lab/attendees.csv) or PORTAL_ATTENDEES_FILE,
//   PORTAL_EVENT_CODE, PORTAL_ADMIN_TOKEN, PORTAL_RESERVED (comma-separated, never handed out),
//   PORTAL_TITLE, PORTAL_STATE_FILE (file store) or PORTAL_STATE_CONFIGMAP + PORTAL_NAMESPACE.
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SA_DIR = "/var/run/secrets/kubernetes.io/serviceaccount";
const MAX_BODY = 4096;
const FAIL_WINDOW_MS = 5 * 60 * 1000;
const FAIL_LIMIT = 30; // wrong event codes per client IP and window (a whole room can share one IP)
const ID_RE = /^[0-9a-f]{32}$/;
const EMAIL_RE = /^[^\s@<>"'`,;]+@[^\s@<>"'`,;]+\.[^\s@<>"'`,;]+$/;

// --------------------------------------------------------------------------------------
// attendees.csv: user,workshop_url,openclaw_ui_url,openclaw_password,grafana_url
// --------------------------------------------------------------------------------------
export function parseAttendees(csv) {
  const out = new Map();
  const lines = String(csv || "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return out;
  const header = lines[0].split(",").map((h) => h.trim());
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const row = Object.fromEntries(header.map((h, i) => [h, (cols[i] || "").trim()]));
    if (row.user) out.set(row.user, row);
  }
  return out;
}

// --------------------------------------------------------------------------------------
// state stores: { assignments: { userNN: { email, id, at } } }
// --------------------------------------------------------------------------------------
export class FileStore {
  constructor(path) { this.path = path; }
  async load() {
    try { return JSON.parse(readFileSync(this.path, "utf8")); } catch (e) {
      if (e.code === "ENOENT") return {};
      throw e;
    }
  }
  async save(state) {
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, this.path);
  }
}

// One ConfigMap (created empty by lab.sh), key state.json. Writes are optimistic (resourceVersion):
// a conflict means someone edited it behind the portal's back, so the portal reloads and the
// attendee retries.
export class ConfigMapStore {
  constructor({ apiUrl, namespace, name, token, ca }) {
    this.base = `${apiUrl}/api/v1/namespaces/${encodeURIComponent(namespace)}/configmaps/${encodeURIComponent(name)}`;
    this.token = token; this.ca = ca; this.cm = null;
  }
  static inCluster(namespace, name) {
    const host = process.env.KUBERNETES_SERVICE_HOST, port = process.env.KUBERNETES_SERVICE_PORT || "443";
    return new ConfigMapStore({
      apiUrl: `https://${host.includes(":") ? `[${host}]` : host}:${port}`,
      namespace: namespace || readFileSync(`${SA_DIR}/namespace`, "utf8").trim(),
      name,
      token: () => readFileSync(`${SA_DIR}/token`, "utf8").trim(), // re-read: the token rotates
      ca: readFileSync(`${SA_DIR}/ca.crt`),
    });
  }
  request(method, body) {
    const url = new URL(this.base);
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const token = typeof this.token === "function" ? this.token() : this.token;
    return new Promise((resolve, reject) => {
      const req = send(url, {
        method, ca: this.ca, timeout: 10_000,
        headers: { Accept: "application/json", "Content-Type": "application/json",
                   ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          let json = null;
          try { json = data ? JSON.parse(data) : null; } catch { /* non-JSON error body */ }
          resolve({ status: res.statusCode, json, text: data });
        });
      });
      req.on("timeout", () => req.destroy(new Error(`${method} ${url.pathname}: timeout`)));
      req.on("error", reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  async load() {
    const r = await this.request("GET");
    if (r.status !== 200) throw new Error(`GET ConfigMap: HTTP ${r.status} ${r.text.slice(0, 200)}`);
    this.cm = r.json;
    const raw = this.cm.data?.["state.json"];
    return raw ? JSON.parse(raw) : {};
  }
  async save(state) {
    const cm = { ...this.cm, data: { ...(this.cm.data || {}), "state.json": JSON.stringify(state, null, 2) } };
    const r = await this.request("PUT", cm);
    if (r.status === 200) { this.cm = r.json; return; }
    const err = new Error(`PUT ConfigMap: HTTP ${r.status} ${r.text.slice(0, 200)}`);
    err.conflict = r.status === 409;
    throw err;
  }
}

// --------------------------------------------------------------------------------------
// assignments
// --------------------------------------------------------------------------------------
export class Registry {
  constructor(store) {
    this.store = store; this.state = { assignments: {} }; this.dirty = false; this.chain = Promise.resolve();
  }
  async init() {
    const s = await this.store.load();
    this.state = { assignments: {}, ...s };
    this.state.assignments ||= {};
  }
  byEmail(email) {
    for (const [user, a] of Object.entries(this.state.assignments)) if (a.email === email) return { user, ...a };
    return null;
  }
  byId(id) {
    for (const [user, a] of Object.entries(this.state.assignments)) if (a.id === id) return { user, ...a };
    return null;
  }
  // Synchronous up to the save, so two concurrent claims can never pick the same user. A failed
  // save keeps the assignment in memory: the attendee retries with the same email and gets it.
  async claim(email, pool) {
    let a = this.byEmail(email);
    if (!a) {
      const free = pool.find((u) => !this.state.assignments[u]);
      if (!free) return null;
      this.state.assignments[free] = { email, id: randomBytes(16).toString("hex"), at: new Date().toISOString() };
      this.dirty = true;
      a = this.byEmail(email);
    }
    if (this.dirty) await this.persist();
    return a;
  }
  async release(user) {
    if (!this.state.assignments[user]) return false;
    delete this.state.assignments[user];
    this.dirty = true;
    await this.persist();
    return true;
  }
  persist() {
    const run = async () => {
      if (!this.dirty) return;
      const snapshot = JSON.parse(JSON.stringify(this.state));
      this.dirty = false;
      try {
        await this.store.save(snapshot);
      } catch (e) {
        this.dirty = true;
        if (e.conflict) {
          // Edited outside the portal: take the stored version, the attendee's request fails.
          await this.init().catch(() => {});
          this.dirty = false;
        }
        throw e;
      }
    };
    this.chain = this.chain.then(run, run);
    return this.chain;
  }
}

// --------------------------------------------------------------------------------------
// HTML
// --------------------------------------------------------------------------------------
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
:root{--bg:#f6f6f4;--card:#fff;--fg:#151515;--muted:#5c5c5c;--line:#d9d9d6;--accent:#ee0000;--accent-fg:#fff;--warn-bg:#fff4e5;--warn-fg:#6b3d00;--ok-bg:#eef7ee;--code:#f0f0ee}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--card:#1d1d1d;--fg:#f0f0f0;--muted:#a8a8a8;--line:#333;--accent:#ff4d4d;--accent-fg:#fff;--warn-bg:#3a2a12;--warn-fg:#ffd8a8;--ok-bg:#1c2b1c;--code:#2a2a2a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 "Red Hat Text",system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:640px;margin:0 auto;padding:24px 16px 48px}
header{display:flex;align-items:center;gap:10px;margin-bottom:20px;color:var(--muted);font-weight:600}
header .dot{width:12px;height:12px;border-radius:50%;background:var(--accent)}
h1{font-size:1.6rem;line-height:1.25;margin:0 0 8px}
h2{font-size:1.1rem;margin:0 0 6px}
p{margin:0 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin:0 0 14px}
.muted{color:var(--muted);font-size:.92rem}
.user{font:700 2.2rem/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em}
.btn{display:inline-block;background:var(--accent);color:var(--accent-fg);text-decoration:none;border:0;border-radius:8px;padding:12px 18px;font-family:inherit;font-size:1rem;font-weight:600;line-height:1.2;cursor:pointer}
.btn.small{padding:6px 10px;font-size:.85rem}
a{color:inherit;overflow-wrap:anywhere}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);border-radius:4px;padding:1px 5px;overflow-wrap:anywhere}
label{display:block;font-weight:600;margin:12px 0 4px}
input{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font:inherit}
input[name=code]{text-transform:uppercase;letter-spacing:.15em}
form .btn{margin-top:16px;width:100%}
.alert{background:var(--warn-bg);color:var(--warn-fg);border-radius:8px;padding:10px 12px;margin:0 0 14px}
.ok{background:var(--ok-bg);color:var(--fg)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 12px;margin:10px 0 0}
dt{color:var(--muted)}dd{margin:0;min-width:0}
dl.stack{grid-template-columns:1fr;gap:2px}dl.stack dd{margin-bottom:8px}
ul{margin:6px 0 0;padding-left:20px}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
.table{overflow-x:auto}
td form{margin:0}
td.mono,td.nowrap{white-space:nowrap;overflow-wrap:normal}`;

function page(title, body, heading) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title><style>${CSS}</style></head><body><main>
<header><span class="dot"></span><span>${esc(heading)}</span></header>
${body}
</main></body></html>`;
}

function formPage(cfg, { error = "", email = "" } = {}) {
  return page(cfg.title, `
<h1>Get your lab environment</h1>
<p class="muted">Enter your email and the event code shown on your table. You get your own, isolated
environment and all its links.</p>
${error ? `<div class="alert" role="alert">${esc(error)}</div>` : ""}
<form class="card" method="post" action="/">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="email" required maxlength="254" value="${esc(email)}">
  <label for="code">Event code</label>
  <input id="code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" required maxlength="32">
  <button class="btn" type="submit">Get my environment</button>
</form>
<p class="muted">Already registered? Enter the same email to get back to your environment. Your email is
only used to find your environment again and is deleted after the lab.</p>`, cfg.title);
}

function attendeePage(cfg, user, row) {
  const ns = `${user}-openshell`, dns = `${user}-demo`;
  if (!row) {
    return page(cfg.title, `<h1>You are <span class="user">${esc(user)}</span></h1>
<div class="alert">Your environment is not available right now. Please ask a facilitator.</div>`, cfg.title);
  }
  return page(`${user} · ${cfg.title}`, `
<p class="muted">Your lab environment</p>
<h1 class="user">${esc(user)}</h1>
<div class="alert ok"><strong>Bookmark this page</strong>: it is your way back to these links. Lost it? Scan the
QR code again and enter the same email and event code.</div>

<section class="card">
  <h2>1 · Open your workshop</h2>
  <p>The lessons and a terminal, in your browser. Follow them in order, from Part I.</p>
  <p><a class="btn" href="${esc(row.workshop_url)}" target="_blank" rel="noopener noreferrer">Open the workshop</a></p>
  <p class="muted">This link signs you in (a cookie keeps you signed in for 7 days). <strong>Do not share
  it</strong>: it is your environment.</p>
</section>

<section class="card">
  <h2>2 · Your agent's Control UI <span class="muted">(from Part IV)</span></h2>
  <dl>
    <dt>URL</dt><dd><a href="${esc(row.openclaw_ui_url)}" target="_blank" rel="noopener noreferrer">${esc(row.openclaw_ui_url)}</a></dd>
    <dt>Password</dt><dd><span class="mono">${esc(row.openclaw_password)}</span></dd>
  </dl>
  <p class="muted" style="margin-top:10px">It only answers once your agent runs (lesson <em>Give It a Brain</em>, Part IV).
  Before that, an HTTP 503 error is expected.</p>
</section>

<section class="card">
  <h2>3 · Grafana</h2>
  <p>Read-only dashboards: metrics, logs and traces of your agents and of the demo app.</p>
  <p><a href="${esc(row.grafana_url)}" target="_blank" rel="noopener noreferrer">${esc(row.grafana_url)}</a></p>
</section>

<section class="card">
  <h2>Your environment</h2>
  <dl class="stack">
    <dt><code>${esc(ns)}</code></dt><dd>your OpenShell gateway, your sandboxes (agents), your skill registry, the workshop</dd>
    <dt><code>${esc(dns)}</code></dt><dd>the demo shop app you break and fix in the Incident Lab</dd>
  </dl>
  <ul class="muted">
    <li>Everything happens in your browser: no OpenShift account, CLI or GPU needed.</li>
    <li>You share the cluster with the other attendees: <code>Forbidden</code> is RBAC doing its job, not a bug.</li>
    <li>Something broken? Ask a facilitator: they can rebuild your environment in a few minutes, and these links stay the same.</li>
  </ul>
</section>`, cfg.title);
}

function messagePage(cfg, title, text) {
  return page(cfg.title, `<h1>${esc(title)}</h1><p>${text}</p><p><a href="/">Back</a></p>`, cfg.title);
}

function adminPage(cfg, host, registry, attendees, pool, notice) {
  const assigned = registry.state.assignments;
  const users = [...new Set([...attendees.keys(), ...Object.keys(assigned)])].sort();
  const rows = users.map((u) => {
    const a = assigned[u];
    let status = pool.includes(u) ? (a ? "assigned" : "free") : (attendees.has(u) ? "reserved" : "not in attendees.csv");
    if (a && !attendees.has(u)) status = "assigned, not in attendees.csv";
    const release = a ? `<form method="post" action="/admin/release"><input type="hidden" name="user" value="${esc(u)}">
<button class="btn small" type="submit">Release</button></form>` : "";
    return `<tr><td class="mono">${esc(u)}</td><td>${esc(status)}</td><td>${esc(a?.email)}</td>
<td class="muted nowrap">${esc(a?.at?.replace("T", " ").slice(0, 16))}</td><td>${release}</td></tr>`;
  }).join("\n");
  const taken = pool.filter((u) => assigned[u]).length;
  return page(`Admin · ${cfg.title}`, `
<h1>Attendee portal</h1>
${notice ? `<div class="alert ok">${esc(notice)}</div>` : ""}
<section class="card">
  <dl>
    <dt>Join URL</dt><dd><span class="mono">https://${esc(host)}/</span></dd>
    <dt>Event code</dt><dd><span class="mono">${esc(cfg.eventCode)}</span></dd>
    <dt>Handed out</dt><dd>${taken} / ${pool.length} (${pool.length - taken} free)</dd>
  </dl>
</section>
<section class="card table"><table>
<thead><tr><th>User</th><th>Status</th><th>Email</th><th>Assigned (UTC)</th><th></th></tr></thead>
<tbody>${rows}</tbody></table></section>
<p class="muted">Release frees an environment for the next attendee (the attendee's own link stops working). It does
not reset the environment itself: run <code>scripts/lab.sh user userNN</code> or <code>lab.sh down</code> + redeploy for that.</p>`,
  cfg.title);
}

// --------------------------------------------------------------------------------------
// HTTP
// --------------------------------------------------------------------------------------
const sha = (s) => createHash("sha256").update(String(s)).digest();
const safeEqual = (a, b) => timingSafeEqual(sha(a), sha(b));
const normCode = (s) => String(s || "").toUpperCase().replace(/[\s-]/g, "");
const normEmail = (s) => String(s || "").trim().toLowerCase();

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((c) => c.trim().split("="))
    .filter(([k, v]) => k && v !== undefined).map(([k, v]) => [k, decodeURIComponent(v)]));
}

// The OpenShift router appends the client address to X-Forwarded-For: take the last entry.
function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff.at(-1) || req.socket.remoteAddress || "?";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    // Past the limit, keep draining (without storing) so the client still gets the 413.
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("body too large"), { status: 413 })); return; }
      chunks.push(c);
    });
    req.on("end", () => { if (size <= MAX_BODY) resolve(new URLSearchParams(Buffer.concat(chunks).toString("utf8"))); });
    req.on("error", reject);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...headers,
  });
  res.end(body);
}

export function loadConfig(env = process.env) {
  const csv = env.PORTAL_ATTENDEES_CSV ?? (env.PORTAL_ATTENDEES_FILE ? readFileSync(env.PORTAL_ATTENDEES_FILE, "utf8") : "");
  return {
    port: Number(env.PORT || 8080),
    title: env.PORTAL_TITLE || "Sandboxed Agent Fleet Lab",
    attendeesCsv: csv,
    eventCode: normCode(env.PORTAL_EVENT_CODE),
    adminToken: env.PORTAL_ADMIN_TOKEN || "",
    reserved: String(env.PORTAL_RESERVED ?? "").split(/[\s,]+/).filter(Boolean),
  };
}

export async function startPortal(cfg, store, { port = cfg.port, host } = {}) {
  if (!cfg.eventCode) throw new Error("PORTAL_EVENT_CODE is required");
  if (!cfg.adminToken) throw new Error("PORTAL_ADMIN_TOKEN is required");
  const attendees = parseAttendees(cfg.attendeesCsv);
  const pool = [...attendees.keys()].filter((u) => !cfg.reserved.includes(u)).sort();
  const registry = new Registry(store);
  await registry.init();
  const failures = new Map(); // ip -> [timestamps]

  const tooManyFailures = (ip) => {
    const now = Date.now();
    const recent = (failures.get(ip) || []).filter((t) => now - t < FAIL_WINDOW_MS);
    failures.set(ip, recent);
    return recent.length >= FAIL_LIMIT;
  };
  const isAdmin = (req) => {
    const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const tok = bearer || cookies(req).lab_portal_admin || "";
    return Boolean(tok) && safeEqual(tok, cfg.adminToken);
  };
  // Same-origin check for admin POSTs (on top of the SameSite=Strict cookie).
  const sameOrigin = (req) => {
    const origin = req.headers.origin;
    if (!origin) return true;
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  };

  const handle = async (req, res) => {
    const url = new URL(req.url, "http://portal");
    const path = url.pathname;

    if (path === "/healthz") return send(res, 200, "ok", { "Content-Type": "text/plain" });
    if (path === "/favicon.ico") return send(res, 204, "");

    if (path === "/" && req.method === "GET") return send(res, 200, formPage(cfg));
    if (path === "/" && req.method === "POST") {
      const ip = clientIp(req);
      if (tooManyFailures(ip)) {
        return send(res, 429, formPage(cfg, { error: "Too many wrong event codes. Wait a few minutes, or ask a facilitator." }));
      }
      const form = await readBody(req);
      const email = normEmail(form.get("email"));
      if (email.length > 254 || !EMAIL_RE.test(email)) {
        return send(res, 400, formPage(cfg, { error: "Please enter a valid email address.", email }));
      }
      if (!safeEqual(normCode(form.get("code")), cfg.eventCode)) {
        failures.get(ip).push(Date.now());
        return send(res, 403, formPage(cfg, { error: "Wrong event code. It is shown on your table.", email }));
      }
      let a;
      try {
        a = await registry.claim(email, pool);
      } catch (e) {
        console.error(`claim failed: ${e.message}`);
        return send(res, 503, formPage(cfg, { error: "Could not save your registration. Please try again in a few seconds.", email }));
      }
      if (!a) {
        return send(res, 503, messagePage(cfg, "No environment left", "All lab environments are taken. Please ask a facilitator."));
      }
      console.log(`assigned ${a.user}`); // never log emails or tokens
      return send(res, 303, "", { Location: `/u/${a.id}` });
    }

    const m = path.match(/^\/u\/([^/]+)$/);
    if (m && req.method === "GET") {
      const a = ID_RE.test(m[1]) ? registry.byId(m[1]) : null;
      if (!a) {
        return send(res, 404, messagePage(cfg, "Link not valid", "This link is no longer valid. Scan the QR code again and enter your email and the event code."));
      }
      return send(res, 200, attendeePage(cfg, a.user, attendees.get(a.user)));
    }

    if (path === "/admin" && req.method === "GET") {
      const tok = url.searchParams.get("token");
      if (tok) {
        if (!safeEqual(tok, cfg.adminToken)) return send(res, 403, messagePage(cfg, "Forbidden", "Wrong admin token."));
        return send(res, 303, "", {
          Location: "/admin",
          "Set-Cookie": `lab_portal_admin=${encodeURIComponent(tok)}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
        });
      }
      if (!isAdmin(req)) return send(res, 401, messagePage(cfg, "Admin", "Open the admin link printed by <code>scripts/lab.sh portal info</code>."));
      return send(res, 200, adminPage(cfg, req.headers.host, registry, attendees, pool, url.searchParams.get("released") ? `Released ${url.searchParams.get("released")}.` : ""));
    }
    if (path === "/admin/release" && req.method === "POST") {
      if (!isAdmin(req) || !sameOrigin(req)) return send(res, 403, messagePage(cfg, "Forbidden", "Admin only."));
      const user = String((await readBody(req)).get("user") || "");
      try {
        await registry.release(user);
      } catch (e) {
        console.error(`release failed: ${e.message}`);
        return send(res, 503, messagePage(cfg, "Not saved", "Could not save the change. Reload the admin page and try again."));
      }
      console.log(`released ${user}`);
      return send(res, 303, "", { Location: `/admin?released=${encodeURIComponent(user)}` });
    }

    return send(res, 404, messagePage(cfg, "Not found", "Nothing here."));
  };

  const server = createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error(`${req.method} ${req.url?.split("?")[0]}: ${e.message}`);
      if (!res.headersSent) send(res, e.status || 500, messagePage(cfg, "Error", "Something went wrong. Please try again."));
    });
  });
  await new Promise((resolve) => server.listen(port, host, resolve));
  return { server, registry, port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}

// Run directly (not when imported by the tests). realpath: the ConfigMap mount is a symlink.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cfg = loadConfig();
  const store = process.env.PORTAL_STATE_FILE
    ? new FileStore(process.env.PORTAL_STATE_FILE)
    : ConfigMapStore.inCluster(process.env.PORTAL_NAMESPACE, process.env.PORTAL_STATE_CONFIGMAP || "lab-portal-state");
  startPortal(cfg, store).then(({ port, registry }) => {
    const n = parseAttendees(cfg.attendeesCsv).size;
    console.log(`lab portal listening on :${port} — ${n} attendees, ${Object.keys(registry.state.assignments).length} assigned, reserved: ${cfg.reserved.join(",") || "none"}`);
  }).catch((e) => { console.error(`lab portal: ${e.message}`); process.exit(1); });
  for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => process.exit(0));
}
