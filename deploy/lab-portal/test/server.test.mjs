// node --test deploy/lab-portal/test/ — no cluster, no dependencies.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigMapStore, FileStore, esc, parseAttendees, startPortal } from "../files/server.mjs";

const CSV = [
  "user,workshop_url,openclaw_ui_url,openclaw_password,grafana_url",
  ...[1, 2, 3, 4].map((i) => {
    const u = `user0${i}`;
    return `${u},https://workshop-${u}-openshell.apps.test/?token=tok${i}&x=1,https://openclaw-ui-${u}-openshell.apps.test/,pw${i},https://grafana-monitoring.apps.test/grafana/`;
  }),
].join("\n");
const CODE = "AB23CD";
const ADMIN = "admin-secret-token";

function config(over = {}) {
  return { port: 0, title: "Test Lab", attendeesCsv: CSV, eventCode: CODE, adminToken: ADMIN, reserved: ["user01"], ...over };
}

async function portal(store, over) {
  const p = await startPortal(config(over), store, { host: "127.0.0.1" });
  p.url = `http://127.0.0.1:${p.port}`;
  return p;
}

function claim(p, email, code = CODE, headers = {}) {
  return fetch(`${p.url}/`, { method: "POST", redirect: "manual", headers, body: new URLSearchParams({ email, code }) });
}

async function claimPage(p, email) {
  const r = await claim(p, email);
  assert.equal(r.status, 303);
  const loc = r.headers.get("location");
  assert.match(loc, /^\/u\/[0-9a-f]{32}$/);
  const page = await fetch(p.url + loc);
  assert.equal(page.status, 200);
  return { loc, html: await page.text() };
}

describe("lab portal", () => {
  let dir, p;
  before(async () => {
    dir = mkdtempSync(join(tmpdir(), "lab-portal-"));
    p = await portal(new FileStore(join(dir, "state.json")));
  });
  after(async () => { await p.close(); rmSync(dir, { recursive: true, force: true }); });

  test("healthz and the sign-up form", async () => {
    assert.equal(await (await fetch(`${p.url}/healthz`)).text(), "ok");
    const r = await fetch(`${p.url}/`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    assert.match(r.headers.get("content-security-policy"), /frame-ancestors 'none'/);
    const html = await r.text();
    assert.match(html, /name="email"/);
    assert.match(html, /name="code"/);
  });

  test("rejects a wrong event code and an invalid email without assigning", async () => {
    const wrong = await claim(p, "a@example.com", "NOPE00");
    assert.equal(wrong.status, 403);
    assert.match(await wrong.text(), /Wrong event code/);
    const bad = await claim(p, "not-an-email");
    assert.equal(bad.status, 400);
    assert.deepEqual(p.registry.state.assignments, {});
  });

  test("assigns the next free user, skipping reserved ones, with all the links", async () => {
    const { html } = await claimPage(p, "alice@example.com");
    assert.match(html, />user02</);
    assert.match(html, /href="https:\/\/workshop-user02-openshell\.apps\.test\/\?token=tok2&amp;x=1"/);
    assert.match(html, /https:\/\/openclaw-ui-user02-openshell\.apps\.test\//);
    assert.match(html, />pw2</);
    assert.match(html, /user02-openshell/);
    assert.match(html, /user02-demo/);
    assert.match(html, /from Part IV/);
    assert.doesNotMatch(html, /tok1|tok3/);
  });

  test("the event code is case- and space-insensitive", async () => {
    const r = await claim(p, "bob@example.com", " ab23cd ");
    assert.equal(r.status, 303);
    assert.equal(p.registry.byEmail("bob@example.com").user, "user03");
  });

  test("the same email (any case) gets the same environment back", async () => {
    const first = p.registry.byEmail("alice@example.com");
    const again = await claim(p, "  Alice@Example.COM ");
    assert.equal(again.headers.get("location"), `/u/${first.id}`);
    assert.equal(Object.keys(p.registry.state.assignments).length, 2);
  });

  test("no environment left", async () => {
    assert.equal((await claim(p, "carol@example.com")).status, 303); // user04, the last one
    const r = await claim(p, "dave@example.com");
    assert.equal(r.status, 503);
    assert.match(await r.text(), /No environment left/);
    assert.equal(p.registry.byEmail("dave@example.com"), null);
  });

  test("unknown or malformed links are 404", async () => {
    assert.equal((await fetch(`${p.url}/u/${"0".repeat(32)}`)).status, 404);
    assert.equal((await fetch(`${p.url}/u/..%2f..%2fetc`)).status, 404);
    assert.equal((await fetch(`${p.url}/nope`)).status, 404);
  });

  test("assignments survive a restart", async () => {
    const before = structuredClone(p.registry.state.assignments);
    const p2 = await portal(new FileStore(join(dir, "state.json")));
    try {
      assert.deepEqual(p2.registry.state.assignments, before);
      assert.equal((await fetch(`${p2.url}/u/${before.user02.id}`)).status, 200);
    } finally { await p2.close(); }
    assert.equal(JSON.parse(readFileSync(join(dir, "state.json"), "utf8")).assignments.user03.email, "bob@example.com");
  });

  test("admin page needs the token", async () => {
    assert.equal((await fetch(`${p.url}/admin`)).status, 401);
    assert.equal((await fetch(`${p.url}/admin?token=wrong`, { redirect: "manual" })).status, 403);
    const login = await fetch(`${p.url}/admin?token=${ADMIN}`, { redirect: "manual" });
    assert.equal(login.status, 303);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /lab_portal_admin=.*HttpOnly.*Secure.*SameSite=Strict/);
    const page = await fetch(`${p.url}/admin`, { headers: { cookie: cookie.split(";")[0] } });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /alice@example\.com/);
    assert.match(html, /reserved/);
    assert.match(html, /3 \/ 3 \(0 free\)/);
    const bearer = await fetch(`${p.url}/admin`, { headers: { authorization: `Bearer ${ADMIN}` } });
    assert.equal(bearer.status, 200);
  });

  test("release frees an environment for the next attendee", async () => {
    const old = p.registry.byEmail("bob@example.com");
    const form = () => new URLSearchParams({ user: "user03" });
    assert.equal((await fetch(`${p.url}/admin/release`, { method: "POST", body: form() })).status, 403);
    const cross = await fetch(`${p.url}/admin/release`, {
      method: "POST", body: form(), redirect: "manual",
      headers: { authorization: `Bearer ${ADMIN}`, origin: "https://evil.example" },
    });
    assert.equal(cross.status, 403);
    const ok = await fetch(`${p.url}/admin/release`, {
      method: "POST", body: form(), redirect: "manual", headers: { authorization: `Bearer ${ADMIN}` },
    });
    assert.equal(ok.status, 303);
    assert.equal((await fetch(`${p.url}/u/${old.id}`)).status, 404);
    const { html } = await claimPage(p, "erin@example.com");
    assert.match(html, />user03</);
  });

  test("rejects oversized bodies", async () => {
    const r = await fetch(`${p.url}/`, { method: "POST", body: new URLSearchParams({ email: "x".repeat(5000), code: CODE }) });
    assert.equal(r.status, 413);
  });
});

test("concurrent claims never share a user", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lab-portal-"));
  const csv = ["user,workshop_url,openclaw_ui_url,openclaw_password,grafana_url",
    ...Array.from({ length: 12 }, (_, i) => `user${String(i + 1).padStart(2, "0")},https://w/${i},https://o/${i},p${i},https://g/`)].join("\n");
  const p = await portal(new FileStore(join(dir, "state.json")), { attendeesCsv: csv, reserved: [] });
  try {
    const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => claim(p, `u${i}@example.com`)));
    assert.ok(rs.every((r) => r.status === 303));
    const users = Object.keys(p.registry.state.assignments);
    assert.equal(new Set(users).size, 12);
    const emails = Object.values(p.registry.state.assignments).map((a) => a.email);
    assert.equal(new Set(emails).size, 12);
  } finally { await p.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("too many wrong event codes from one address are rate limited", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lab-portal-"));
  const p = await portal(new FileStore(join(dir, "state.json")));
  try {
    for (let i = 0; i < 30; i++) assert.equal((await claim(p, "x@example.com", `BAD${i}`)).status, 403);
    assert.equal((await claim(p, "x@example.com")).status, 429);
    // another client behind the router (X-Forwarded-For) is not affected
    assert.equal((await claim(p, "y@example.com", CODE, { "x-forwarded-for": "10.0.0.9" })).status, 303);
  } finally { await p.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("a user missing from attendees.csv shows a facilitator message", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lab-portal-"));
  const store = new FileStore(join(dir, "state.json"));
  const p = await portal(store);
  const { loc } = await claimPage(p, "z@example.com");
  await p.close();
  const p2 = await portal(store, { attendeesCsv: CSV.split("\n").filter((l) => !l.startsWith("user02,")).join("\n") });
  try {
    const html = await (await fetch(p2.url + loc)).text();
    assert.match(html, /not available right now/);
  } finally { await p2.close(); rmSync(dir, { recursive: true, force: true }); }
});

// Minimal fake of the Kubernetes ConfigMap API (GET / PUT with resourceVersion).
function fakeKube() {
  const cm = { apiVersion: "v1", kind: "ConfigMap", metadata: { name: "lab-portal-state", namespace: "lab-portal", resourceVersion: "1" } };
  const seen = [];
  const server = createServer((req, res) => {
    seen.push({ method: req.method, url: req.url, auth: req.headers.authorization });
    if (req.url !== "/api/v1/namespaces/lab-portal/configmaps/lab-portal-state") { res.writeHead(404); return res.end("{}"); }
    if (req.method === "GET") { res.writeHead(200); return res.end(JSON.stringify(cm)); }
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      const next = JSON.parse(body);
      if (next.metadata.resourceVersion !== cm.metadata.resourceVersion) { res.writeHead(409); return res.end('{"reason":"Conflict"}'); }
      cm.data = next.data;
      cm.metadata.resourceVersion = String(Number(cm.metadata.resourceVersion) + 1);
      res.writeHead(200); res.end(JSON.stringify(cm));
    });
  });
  return { cm, seen, server };
}

test("ConfigMap store: persists, sends the token, and recovers from an outside edit", async () => {
  const kube = fakeKube();
  await new Promise((r) => kube.server.listen(0, "127.0.0.1", r));
  const apiUrl = `http://127.0.0.1:${kube.server.address().port}`;
  const store = () => new ConfigMapStore({ apiUrl, namespace: "lab-portal", name: "lab-portal-state", token: () => "sa-token" });
  const p = await portal(store());
  try {
    assert.equal((await claim(p, "a@example.com")).status, 303);
    assert.equal(JSON.parse(kube.cm.data["state.json"]).assignments.user02.email, "a@example.com");
    assert.ok(kube.seen.every((s) => s.auth === "Bearer sa-token"));

    // Someone edits the ConfigMap behind the portal's back: the next claim fails (409), then works.
    kube.cm.metadata.resourceVersion = "99";
    kube.cm.data = { "state.json": JSON.stringify({ assignments: {} }) };
    assert.equal((await claim(p, "b@example.com")).status, 503);
    assert.deepEqual(p.registry.state.assignments, {});
    assert.equal((await claim(p, "b@example.com")).status, 303);
    assert.equal(JSON.parse(kube.cm.data["state.json"]).assignments.user02.email, "b@example.com");

    // A fresh process reads it back.
    const p2 = await portal(store());
    try { assert.equal(p2.registry.byEmail("b@example.com").user, "user02"); } finally { await p2.close(); }
  } finally { await p.close(); kube.server.close(); }
});

test("reserved environments are handed out only once an admin makes them available", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lab-portal-"));
  const store = new FileStore(join(dir, "state.json"));
  const p = await portal(store, { reserved: ["user01", "user02", "user03"] });
  const admin = (path, user) => fetch(`${p.url}/admin/${path}`, {
    method: "POST", redirect: "manual", headers: { authorization: `Bearer ${ADMIN}` }, body: new URLSearchParams({ user }) });
  try {
    assert.equal(p.registry.byEmail("a@example.com"), null);
    assert.equal((await claim(p, "a@example.com")).status, 303);
    assert.equal(p.registry.byEmail("a@example.com").user, "user04");
    assert.equal((await claim(p, "b@example.com")).status, 503); // only user04 was available
    const page = await (await fetch(`${p.url}/admin`, { headers: { authorization: `Bearer ${ADMIN}` } })).text();
    assert.match(page, /Make available/);
    assert.equal((await admin("unreserve", "user04")).status, 400); // not a reserved one
    assert.equal((await admin("unreserve", "user02")).status, 303);
    assert.equal((await claim(p, "b@example.com")).status, 303);
    assert.equal(p.registry.byEmail("b@example.com").user, "user02");
    assert.equal((await admin("unreserve", "user03")).status, 303);
    assert.equal((await admin("reserve", "user03")).status, 303);
    assert.equal((await claim(p, "c@example.com")).status, 503);
    const p2 = await portal(store, { reserved: ["user01", "user02", "user03"] });
    try { assert.deepEqual(p2.registry.state.unreserved, ["user02"]); } finally { await p2.close(); }
  } finally { await p.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("helpers", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  const rows = parseAttendees(CSV + "\n\n");
  assert.equal(rows.size, 4);
  assert.equal(rows.get("user03").openclaw_password, "pw3");
});
