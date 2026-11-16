"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Check, X, Globe, ShieldQuestion, UserPlus, Box } from "lucide-react";
import { useT, useLang } from "@/lib/lang-client";

type L7Rule = { allow?: { method?: string; path?: string } };
type Endpoint = { host?: string; port?: number; ports?: number[]; path?: string; rules?: L7Rule[] };
type Chunk = {
  id: string; status?: string; ruleName?: string; rationale?: string; rejectionReason?: string;
  securityFlagged?: boolean; securityNotes?: string; applicationError?: string; binary?: string;
  hitCount?: number; createdMs?: number | null; proposedRule?: { endpoints?: Endpoint[] } | null;
};
type Device = { requestId: string; deviceId: string; roles: string[]; scopes: string[]; isRepair: boolean; ts: number | null };

function dest(c: Chunk): string {
  const eps = c.proposedRule?.endpoints ?? [];
  const parts = eps.map((e) => {
    const port = e.port || (e.ports && e.ports[0]) || "";
    const paths = (e.rules ?? []).map((r) => `${r.allow?.method || "*"} ${r.allow?.path || "/**"}`);
    return `${e.host || "?"}${port ? `:${port}` : ""}${paths.length ? ` ${paths.join(", ")}` : ""}`;
  });
  return parts.join(" · ") || c.ruleName || "—";
}
function age(ms: number | null): string {
  if (!ms) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 90) return `${s}s`; if (s < 5400) return `${Math.floor(s / 60)}m`;
  if (s < 172800) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`;
}

export function Approvals() {
  const t = useT();
  const fr = useLang() === "fr";
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [agent, setAgent] = useState<string>("");
  const [draftVersion, setDraftVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  type Snapshot = { dr: Record<string, unknown>; dv: Record<string, unknown> };
  const fetchSnapshot = useCallback(async (): Promise<Snapshot> => {
    const [dr, dv] = await Promise.all([
      fetch("/api/drafts", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/devices", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]);
    return { dr, dv };
  }, []);
  const apply = useCallback(({ dr, dv }: Snapshot) => {
    setChunks(Array.isArray(dr?.chunks) ? (dr.chunks as Chunk[]) : []);
    // uint64 draft_version arrives as a decimal string (proto-loader longs: String)
    const ver = dr?.draftVersion;
    setDraftVersion(ver === null || ver === undefined || ver === "" ? null : String(ver));
    setDevices(Array.isArray(dv?.pending) ? (dv.pending as Device[]) : []);
    setAgent(String(dr?.agent || dv?.agent || ""));
  }, []);
  // manual reload (spinner); the poller below updates silently
  const load = useCallback(async () => {
    setLoading(true);
    try { apply(await fetchSnapshot()); } finally { setLoading(false); }
  }, [apply, fetchSnapshot]);

  const draftAct = useCallback(async (action: string, chunkId?: string, reason?: string) => {
    setBusy("d" + action + (chunkId || "")); setMsg("");
    try {
      const j = await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, chunkId, reason }) }).then((r) => r.json());
      setMsg(j.ok ? t(`access ${action} ✓`, `accès ${action} ✓`) : t(`Error: ${j.error || "failed"}`, `Erreur : ${j.error || "échec"}`));
      await load();
    } finally { setBusy(""); }
  }, [load, t]);

  const deviceAct = useCallback(async (requestId: string, action: "approve" | "reject") => {
    setBusy("v" + action + requestId); setMsg("");
    try {
      const j = await fetch("/api/devices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, requestId }) }).then((r) => r.json());
      setMsg(j.ok ? t(`device ${action} ✓`, `appareil ${action} ✓`) : t(`Error: ${j.error || "failed"}`, `Erreur : ${j.error || "échec"}`));
      await load();
    } finally { setBusy(""); }
  }, [load, t]);

  // One-time: grant the operator admin rights so it can approve device pairings. Fixes the
  // "scope upgrade pending" / "device is asking for more scopes than currently approved"
  // deadlock — runs the same grant the scripted provisioner does, via the host-privileged
  // /api/devices route (so it's not subject to the operator-scope deadlock itself).
  const enableApprovals = useCallback(async () => {
    setBusy("bootstrap"); setMsg(t("Enabling approvals (granting the operator admin + restarting the gateway)…", "Activation des approbations (droits admin pour l'operator + redémarrage de la gateway)…"));
    try {
      const j = await fetch("/api/devices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bootstrap-admin" }) }).then((r) => r.json());
      setMsg(j.ok ? (j.output || t("approvals enabled ✓", "approbations activées ✓")) : t(`Error: ${j.error || "failed"}`, `Erreur : ${j.error || "échec"}`));
      await load();
    } finally { setBusy(""); }
  }, [load, t]);

  useEffect(() => {
    let alive = true;
    const tick = async () => { const snap = await fetchSnapshot(); if (alive) apply(snap); };
    tick();
    const t = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [apply, fetchSnapshot]);

  const pendingChunks = chunks.filter((c) => (c.status || "pending") === "pending");
  const decidedChunks = chunks.filter((c) => (c.status || "pending") !== "pending");

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[12px] text-[var(--color-fg-mut)]">
          {t(`${pendingChunks.length} access · ${devices.length} device${devices.length === 1 ? "" : "s"} pending`, `${pendingChunks.length} accès · ${devices.length} appareil${devices.length === 1 ? "" : "s"} en attente`)}{draftVersion != null ? ` · policy v${draftVersion}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {pendingChunks.length > 0 && (
            <button disabled={!!busy} onClick={() => draftAct("approve-all")}
              className="rounded-md border border-[var(--color-nv-dim)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-nv-bright)] transition hover:bg-[var(--color-panel)] disabled:opacity-50">{t("Approve all access", "Tout approuver")}</button>
          )}
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line-2)] px-2.5 py-1 text-[11px] text-[var(--color-fg-mut)] transition hover:text-[var(--color-fg)]">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {t("Refresh", "Rafraîchir")}
          </button>
        </div>
      </div>
      {msg && <div className="mb-3 rounded-md border border-[var(--color-line-2)] bg-[var(--color-bg-2)] px-3 py-1.5 font-mono text-[11px] text-[var(--color-fg-dim)]">{msg}</div>}

      {/* ---- egress access requests (draft policy) ---- */}
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-fg)]"><Globe size={15} className="text-[var(--color-fg-mut)]" /> {t("Access requests", "Demandes d'accès")} <span className="text-[11px] font-normal text-[var(--color-fg-mut)]">{t("— APIs / sites the agent was denied", "— APIs / sites refusés à l'agent")}</span></h2>
      {chunks.length === 0 ? (
        <div className="mt-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-[13px] text-[var(--color-fg-mut)]">
          {fr
            ? <>Aucune. Quand l&apos;agent se voit <strong>refuser</strong> l&apos;accès à un hôte, la gateway propose ici une allow-rule à approuver ou à refuser.</>
            : <>None. When the agent is <strong>denied</strong> reaching a host, the gateway proposes an allow-rule here to approve or deny.</>}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {[...pendingChunks, ...decidedChunks].map((c) => {
            const st = c.status || "pending";
            const tone = st === "approved" ? "var(--color-nv-bright)" : st === "rejected" ? "#ee7777" : "#e0a800";
            return (
              <div key={c.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3" style={st === "pending" ? { borderColor: "#e0a80055" } : undefined}>
                <div className="flex flex-wrap items-center gap-2">
                  {agent && <span className="inline-flex items-center gap-1 rounded border border-[var(--color-line-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-mut)]"><Box size={10} /> {agent}</span>}
                  <span className="font-mono text-[13px] text-[var(--color-fg)]">{dest(c)}</span>
                  {c.securityFlagged && <span className="rounded bg-[#ee555533] px-1.5 py-0.5 text-[9px] font-semibold text-[#ee7777]">security-flagged</span>}
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: tone, border: `1px solid ${tone}55` }}>{st}</span>
                </div>
                {(c.binary || age(c.createdMs ?? null)) && (
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-fg-mut)]">
                    {c.binary ? t(`binary ${c.binary}`, `binaire ${c.binary}`) : ""}{c.binary && c.hitCount ? " · " : ""}{c.hitCount ? `${c.hitCount} hit${c.hitCount === 1 ? "" : "s"}` : ""}{age(c.createdMs ?? null) ? t(` · ${age(c.createdMs ?? null)} ago`, ` · il y a ${age(c.createdMs ?? null)}`) : ""}
                  </p>
                )}
                {c.rationale && <p className="mt-1 text-[12px] text-[var(--color-fg-dim)]">{c.rationale}</p>}
                {c.securityNotes && <p className="mt-1 text-[11px] text-[#e0a800]">{t("Security notes:", "Notes de sécurité :")} {c.securityNotes}</p>}
                {c.applicationError && <p className="mt-1 text-[11px] text-[#ee7777]">{t("Cannot apply:", "Impossible d'appliquer :")} {c.applicationError}</p>}
                {c.rejectionReason && <p className="mt-1 text-[11px] text-[#ee7777]">{t("Rejected:", "Motif du refus :")} {c.rejectionReason}</p>}
                <div className="mt-2 flex gap-2">
                  {st === "pending" ? (
                    <>
                      <button disabled={!!busy} onClick={() => draftAct("approve", c.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-nv-dim)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-nv-bright)] transition hover:bg-[var(--color-bg-2)] disabled:opacity-50"><Check size={12} /> {t("Approve", "Approuver")}</button>
                      <button disabled={!!busy} onClick={() => { const reason = window.prompt(t("Rejection reason (optional):", "Motif du refus (facultatif) :")) ?? ""; draftAct("reject", c.id, reason); }} className="inline-flex items-center gap-1 rounded-md border border-[#ee5555] px-2.5 py-1 text-[12px] font-semibold text-[#ee7777] transition hover:bg-[var(--color-bg-2)] disabled:opacity-50"><X size={12} /> {t("Deny", "Refuser")}</button>
                    </>
                  ) : (
                    <button disabled={!!busy} onClick={() => draftAct("undo", c.id)} className="rounded-md border border-[var(--color-line-2)] px-2.5 py-1 text-[12px] text-[var(--color-fg-mut)] transition hover:text-[var(--color-fg)] disabled:opacity-50">{t("Undo", "Annuler")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- device pairing approvals ---- */}
      <div className="mt-6 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-fg)]"><UserPlus size={15} className="text-[var(--color-fg-mut)]" /> {t("Device approvals", "Approbations d'appareils")} <span className="text-[11px] font-normal text-[var(--color-fg-mut)]">{t("— browsers / CLIs asking to pair", "— navigateurs / CLIs qui demandent l'appairage")}</span></h2>
        <button disabled={!!busy} onClick={enableApprovals}
          title={t("One-time: grant the operator admin rights so it can approve pairings. Fixes 'scope upgrade pending approval' on a fresh gateway.", "Une seule fois : donne les droits admin à l'operator pour qu'il puisse approuver les appairages. Corrige « scope upgrade pending approval » sur une gateway neuve.")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line-2)] px-2.5 py-1 text-[11px] text-[var(--color-fg-mut)] transition hover:text-[var(--color-fg)] disabled:opacity-50">
          <ShieldQuestion size={12} /> {t("Enable approvals", "Activer les approbations")}
        </button>
      </div>
      {devices.length === 0 ? (
        <div className="mt-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-[13px] text-[var(--color-fg-mut)]">
          {t("None. When a new browser or CLI tries to connect to the agent's Control UI, its pairing request appears here.", "Aucune. Quand un nouveau navigateur ou CLI tente de se connecter à la Control UI de l'agent, sa demande d'appairage apparaît ici.")}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {devices.map((d) => (
            <div key={d.requestId} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3" style={{ borderColor: "#e0a80055" }}>
              <div className="flex flex-wrap items-center gap-2">
                {agent && <span className="inline-flex items-center gap-1 rounded border border-[var(--color-line-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-mut)]"><Box size={10} /> {agent}</span>}
                <span className="font-mono text-[13px] text-[var(--color-fg)]">{(d.deviceId || d.requestId).slice(0, 16)}…</span>
                {d.isRepair && <span className="rounded bg-[var(--color-line-2)] px-1.5 py-0.5 text-[9px] text-[var(--color-fg-mut)]">scope upgrade</span>}
                <span className="font-mono text-[10px] text-[var(--color-fg-mut)]">{(d.scopes.length ? d.scopes : d.roles).join(", ")}</span>
                {age(d.ts) && <span className="text-[10px] text-[var(--color-fg-mut)]">{age(d.ts)}</span>}
                <div className="ml-auto flex gap-2">
                  <button disabled={!!busy} onClick={() => deviceAct(d.requestId, "approve")} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-nv-dim)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-nv-bright)] transition hover:bg-[var(--color-bg-2)] disabled:opacity-50"><Check size={12} /> {t("Approve", "Approuver")}</button>
                  <button disabled={!!busy} onClick={() => deviceAct(d.requestId, "reject")} className="inline-flex items-center gap-1 rounded-md border border-[#ee5555] px-2.5 py-1 text-[12px] font-semibold text-[#ee7777] transition hover:bg-[var(--color-bg-2)] disabled:opacity-50"><X size={12} /> {t("Deny", "Refuser")}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-[var(--color-fg-mut)]">
        {fr
          ? <><strong>Accès</strong> : approuver fusionne l&apos;allow-rule proposée dans la policy egress active de l&apos;agent (draft-policy de la gateway via <code>/api/drafts</code>). <strong>Appareil</strong> : approuver appaire l&apos;appareil (<code>openclaw devices</code> via <code>/api/devices</code>). Chaque décision est auditée.</>
          : <><strong>Access</strong>: approve merges the proposed allow-rule into the agent&apos;s live egress policy (gateway draft-policy via <code>/api/drafts</code>). <strong>Device</strong>: approve pairs the device (<code>openclaw devices</code> via <code>/api/devices</code>). Every decision is audited.</>}
      </p>
    </div>
  );
}
