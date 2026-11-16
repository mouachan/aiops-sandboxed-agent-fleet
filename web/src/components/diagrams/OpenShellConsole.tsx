"use client";
import { useState } from "react";
import { useLang, useT } from "@/lib/lang-client";

// A lightweight, faithful mock of the OpenShell Console (github: openshell-ui) — the
// real web UI for the gateway. It normally signs in with OIDC and talks gRPC through a
// BFF; here we showcase its views (Fleet / Sandboxes / Policy / Network) with sample
// data so attendees see what managing the fleet looks like.

const NV = "#76b900";
const TABS = ["Fleet", "Sandboxes", "Policy", "Network"] as const;
type Tab = (typeof TABS)[number];

const SANDBOXES = [
  { name: "shifty", phase: "Ready", image: "openclaw-sandbox:2026.8.2", ns: "user07-openshell" },
  { name: "pod-doctor", phase: "Ready", image: "openclaw-sandbox:2026.8.2", ns: "user07-openshell" },
  { name: "scout", phase: "Provisioning", image: "openclaw-sandbox:2026.8.2", ns: "user07-openshell" },
];

type T = (en: string, fr: string) => string;

function egress(t: T) {
  return [
    { v: "ALLOW", bin: "/usr/bin/oc", host: "kubernetes.default.svc:443", m: "GET /api/v1/pods" },
    { v: "ALLOW", bin: "/usr/local/bin/node", host: "<your-endpoint>:443", m: t("POST /v1/chat (credential injected)", "POST /v1/chat (identifiant injecté)") },
    { v: "DENY", bin: "/usr/bin/curl", host: "evil.example.com:443", m: "CONNECT" },
    { v: "DENY", bin: "/usr/bin/oc", host: "kubernetes.default.svc:443", m: "DELETE /api/v1/…" },
  ];
}

export function OpenShellConsole() {
  const t = useT();
  const fr = useLang() === "fr";
  const EGRESS = egress(t);
  const [tab, setTab] = useState<Tab>("Fleet");
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: NV }} />
        <span className="text-xs font-semibold">OpenShell Console</span>
        <span className="text-[10px] text-[var(--color-fg-mut)]">{t("— gateway fleet management (mock)", "— gestion de la fleet via la gateway (maquette)")}</span>
        <span className="ml-auto rounded bg-[var(--color-bg-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-fg-mut)]">admin · OIDC</span>
      </div>
      {/* tabs */}
      <div className="flex gap-1 border-b border-[var(--color-line)] px-2 pt-2">
        {TABS.map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className="rounded-t-md px-3 py-1.5 text-xs font-medium transition"
            style={{ background: tab === k ? "var(--color-bg-2)" : "transparent",
                     color: tab === k ? NV : "var(--color-fg-mut)",
                     borderBottom: tab === k ? `2px solid ${NV}` : "2px solid transparent" }}>
            {k}
          </button>
        ))}
      </div>
      <div className="p-4 text-sm">
        {tab === "Fleet" && (
          <div className="grid grid-cols-3 gap-3">
            {[["3", "Sandboxes"], ["2", "Ready"], ["1", "Provisioning"]].map(([n, l]) => (
              <div key={l} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-2)] p-3">
                <div className="text-2xl font-bold" style={{ color: NV }}>{n}</div>
                <div className="text-[11px] text-[var(--color-fg-mut)]">{l}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "Sandboxes" && (
          <table className="w-full text-left text-xs">
            <thead className="text-[var(--color-fg-mut)]"><tr><th className="py-1">Name</th><th>Namespace</th><th>Image</th><th>Phase</th></tr></thead>
            <tbody>
              {SANDBOXES.map((s) => (
                <tr key={s.name} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 font-medium">{s.name}</td>
                  <td className="text-[var(--color-fg-mut)]">{s.ns}</td>
                  <td className="text-[var(--color-fg-mut)]">{s.image}</td>
                  <td><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: s.phase === "Ready" ? "#34d39922" : "#e0a80022",
                                 color: s.phase === "Ready" ? "#34d399" : "#e0a800" }}>{s.phase}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "Policy" && (
          <div className="space-y-1.5 font-mono text-[11px] text-[var(--color-fg-dim)]">
            <div className="text-[var(--color-fg-mut)]">{t("# pod-doctor · allowed egress (deny-by-default)", "# pod-doctor · egress autorisé (deny-by-default)")}</div>
            <div>✓ /usr/bin/oc → kubernetes.default.svc:443 · GET /api/**, /apis/**</div>
            <div>{t("✓ /usr/local/bin/node → <your-endpoint>:443 · POST /v1/** (credential injected)", "✓ /usr/local/bin/node → <your-endpoint>:443 · POST /v1/** (identifiant injecté)")}</div>
            <div>{t("✓ /usr/bin/curl → thanos-querier.openshift-monitoring.svc:9092 · GET /api/v1/** (?namespace=your demo ns)", "✓ /usr/bin/curl → thanos-querier.openshift-monitoring.svc:9092 · GET /api/v1/** (?namespace=votre ns de démo)")}</div>
            <div className="text-[var(--color-fg-mut)]">{t("✗ everything else — blocked", "✗ tout le reste — bloqué")}</div>
          </div>
        )}
        {tab === "Network" && (
          <table className="w-full text-left text-xs">
            <thead className="text-[var(--color-fg-mut)]"><tr><th className="py-1">Verdict</th><th>Binary</th><th>Host</th><th>Request</th></tr></thead>
            <tbody>
              {EGRESS.map((e, i) => (
                <tr key={i} className="border-t border-[var(--color-line)] font-mono text-[11px]">
                  <td className="py-1.5"><span className="font-bold" style={{ color: e.v === "ALLOW" ? "#34d399" : "#ef6b6b" }}>{e.v}</span></td>
                  <td className="text-[var(--color-fg-mut)]">{e.bin}</td>
                  <td className="text-[var(--color-fg-mut)]">{e.host}</td>
                  <td className="text-[var(--color-fg-mut)]">{e.m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <figcaption className="border-t border-[var(--color-line)] px-3 py-2 text-[11px] text-[var(--color-fg-mut)]">
        {fr
          ? <>La vraie console (<code>openshell-ui</code>) ajoute des terminaux PTY en direct, une boîte de réception policy-advisor et la gestion des providers — branchée sur n&apos;importe quelle gateway OpenShell en gRPC.</>
          : <>The real console (<code>openshell-ui</code>) adds live PTY terminals, a policy-advisor inbox, and provider management — pointed at any OpenShell gateway over gRPC.</>}
      </figcaption>
    </figure>
  );
}
