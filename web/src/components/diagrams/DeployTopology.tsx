"use client";
import { useState, type ReactNode } from "react";
import { useLang, useT } from "@/lib/lang-client";

// Fleet-demo-style end-to-end topology of THIS workshop: OpenShift cluster with
// the OpenShell gateway, the agent-sandbox controller, and the sandbox pods, plus how
// you reach them (Routes) and remote inference. Click a box.

const NV = "#76b900", BLUE = "#6f8fd0", PURPLE = "#a78bfa", AMBER = "#e0a800",
      GREEN = "#34d399", SLATE = "#94a3b8", CYAN = "#22d3ee";

type Box = { id: string; label: string; sub?: string; color: string; detail: ReactNode };

type T = (en: string, fr: string) => string;

function boxes(t: T, fr: boolean): Record<string, Box> {
  return {
    gw:    { id: "gw", label: "OpenShell Gateway", sub: "StatefulSet · gRPC :8080", color: NV,
             detail: fr
               ? <>Le control plane, installé par Helm (OpenShell 0.1.6). Son compute driver surveille le CRD Sandbox ; la gateway émet les JWT des sandboxes et conserve la policy ainsi que les identifiants des providers. On n&apos;y accède que par son Service interne au cluster, sans Route publique, car elle accepte les clients non authentifiés.</>
               : <>Helm-installed control plane (OpenShell 0.1.6). Compute driver watches the Sandbox CRD; mints sandbox JWTs; stores policy and provider credentials. Reached through its in-cluster Service only — no public Route (it accepts unauthenticated clients).</> },
    ctrl:  { id: "ctrl", label: t("agent-sandbox controller", "contrôleur agent-sandbox"), sub: "agent-sandbox-system · v1.0.3", color: BLUE,
             detail: fr
               ? <>kubernetes-sigs/agent-sandbox v1.0.3, installé une seule fois par cluster. Il traduit chaque CR Sandbox <code>agents.x-k8s.io/v1beta1</code> en Pod (+PVC) ; c&apos;est la version d&apos;API que parle la gateway 0.1.6.</>
               : <>kubernetes-sigs/agent-sandbox v1.0.3, installed once per cluster. Reconciles each <code>agents.x-k8s.io/v1beta1</code> Sandbox CR into a Pod (+PVC) — the API version the 0.1.6 gateway speaks.</> },
    shifty:{ id: "shifty", label: "Shifty (OpenClaw)", sub: "sandbox default--shifty", color: PURPLE,
             detail: fr
               ? <>Votre agent : une sandbox OpenClaw qui sert sa Control UI (appairage des appareils, chat) sur le port <code>30789</code>, à l&apos;intérieur de la sandbox. Le sidecar <code>openclaw-forward</code> du pod workshop relaie ce port avec <code>openshell forward</code>, et la Route <code>openclaw-ui</code> le publie. Son identité est définie dans les fichiers <code>.md</code> du workspace.</>
               : <>Your agent — an OpenClaw sandbox serving its control UI (device pairing, chat) on sandbox-internal port <code>30789</code>. The workshop pod&apos;s <code>openclaw-forward</code> sidecar bridges it with <code>openshell forward</code>, and the <code>openclaw-ui</code> Route exposes that. Its identity lives in workspace <code>.md</code> files.</> },
    sbx:   { id: "sbx", label: t("Sandbox pods", "Pods des sandboxes"), sub: "default--<name> + os-supervisor-…", color: GREEN,
             detail: fr
               ? <>La gateway crée les sandboxes (<code>openshell sandbox create</code>) dans son propre namespace. Chacune est un Pod <code>default--&lt;name&gt;</code> doté d&apos;un conteneur <code>agent</code> sur un PVC, accompagné d&apos;un pod supervisor que la gateway lance pour elle. Le tout tourne sous la SCC <code>restricted-v2</code> (sans aucun privilège) et, dans un lab partagé, des NetworkPolicies tiennent les autres participants à l&apos;écart.</>
               : <>Gateway-created sandboxes (<code>openshell sandbox create</code>), in the gateway&apos;s own namespace. Each is a Pod <code>default--&lt;name&gt;</code> with an <code>agent</code> container on a PVC, plus a supervisor pod the gateway runs for it — under the <code>restricted-v2</code> SCC (no privileged grant) and, in a shared lab, NetworkPolicies that keep other attendees out.</> },
    console:{ id: "console", label: "OpenShift Console", sub: "Route · /console", color: AMBER,
             detail: fr
               ? <>La console web du cluster, accessible par sa <code>Route</code> OpenShift : toute la stack y apparaît sous forme d&apos;objets natifs. Facultative, elle est masquée dans un lab partagé où les participants n&apos;ont pas de compte console.</>
               : <>The web console for the cluster (read the whole stack as native objects), reached via its OpenShift <code>Route</code>. Optional — hidden in a shared lab without per-attendee console logins.</> },
    inf:   { id: "inf", label: t("Model endpoint", "Endpoint du modèle"), sub: t("OpenAI-compatible · Models-as-a-Service or remote", "compatible OpenAI · Models-as-a-Service ou distant"), color: CYAN,
             detail: fr
               ? <>Un endpoint compatible OpenAI ; dans ce lab, le modèle <code>nemotron</code> servi par OpenShift AI Models-as-a-Service. La clé est enregistrée dans la gateway sous forme de <em>provider</em>. Les sandboxes rattachées à ce provider appellent le vrai endpoint avec une clé placeholder, et le supervisor injecte la vraie clé en egress, uniquement vers cet endpoint et uniquement depuis <code>node</code>/<code>curl</code>.</>
               : <>An OpenAI-compatible endpoint — in this lab, the <code>nemotron</code> model served by OpenShift AI Models-as-a-Service. The key is stored in the gateway as a <em>provider</em>; sandboxes it&apos;s attached to call the real endpoint with a placeholder key, and the supervisor injects the real one on egress — only toward that endpoint, only from <code>node</code>/<code>curl</code>.</> },
  };
}

function B({ id, sel, onSelect }: { id: string; sel: string; onSelect: (id: string) => void }) {
  const t = useT();
  const fr = useLang() === "fr";
  const b = boxes(t, fr)[id];
  return (
    <button onClick={() => onSelect(id)}
      className="w-full rounded-lg border px-3 py-2 text-left transition"
      style={{ borderColor: b.color, background: sel === id ? `${b.color}26` : "transparent",
               boxShadow: sel === id ? `0 0 0 1px ${b.color}` : "none", opacity: sel === id ? 1 : 0.82 }}>
      <div className="text-[13px] font-semibold" style={{ color: b.color }}>{b.label}</div>
      {b.sub && <div className="text-[10px] text-[var(--color-fg-mut)]">{b.sub}</div>}
    </button>
  );
}

export function DeployTopology() {
  const t = useT();
  const fr = useLang() === "fr";
  const [sel, setSel] = useState("gw");
  const active = boxes(t, fr)[sel];

  return (
    <figure className="my-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <figcaption className="mb-3 text-sm text-[var(--color-fg-mut)]">{t("What actually runs on your cluster — click a box", "Ce qui tourne réellement sur votre cluster : cliquez sur un bloc")}</figcaption>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-dashed p-3" style={{ borderColor: SLATE }}>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-fg-mut)]">{t("OpenShift cluster (Helm-deployed)", "Cluster OpenShift (déployé par Helm)")}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-line)] p-2">
              <div className="mb-1 text-[10px] text-[var(--color-fg-mut)]">{t("ns: <user>-openshell (single: openshell)", "ns : <user>-openshell (instance unique : openshell)")}</div>
              <div className="space-y-2"><B sel={sel} onSelect={setSel} id="gw" /><B sel={sel} onSelect={setSel} id="sbx" /></div>
            </div>
            <div className="rounded-lg border border-[var(--color-line)] p-2">
              <div className="mb-1 text-[10px] text-[var(--color-fg-mut)]">{t("control + agents", "control plane et agents")}</div>
              <div className="space-y-2"><B sel={sel} onSelect={setSel} id="ctrl" /><B sel={sel} onSelect={setSel} id="shifty" /><B sel={sel} onSelect={setSel} id="console" /></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-2 md:w-[190px]">
          <B sel={sel} onSelect={setSel} id="inf" />
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4 text-sm text-[var(--color-fg-dim)]">
        <div className="mb-1 text-xs font-semibold" style={{ color: active.color }}>{active.label}</div>
        <div>{active.detail}</div>
      </div>
    </figure>
  );
}
