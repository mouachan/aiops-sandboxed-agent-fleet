"use client";
import { useState, type ReactNode } from "react";
import { useLang, useT } from "@/lib/lang-client";

// Interactive OpenShell runtime diagram. Two lanes (the agent path + the guardrail
// path) inside the OpenShell box, matching the NVIDIA deck. Toggle between the
// LOGICAL view ("what it is") and the KUBERNETES view ("what it becomes on the
// cluster") — the same components, two lenses. Click any component for detail.

const NV = "#76b900", PURPLE = "#a78bfa", BLUE = "#6f8fd0", GREEN = "#34d399",
      AMBER = "#e0a800", CYAN = "#22d3ee", RED = "#ef6b6b", SLATE = "#94a3b8";

type Comp = {
  id: string; label: string; sub: string; color: string; lane: "agent" | "guard";
  what: ReactNode;     // logical: what it is
  k8s: ReactNode;      // on Kubernetes: what it becomes
};

type T = (en: string, fr: string) => string;

function comps(t: T, fr: boolean): Comp[] {
  return [
    { id: "gw", label: "Gateway", sub: t("control plane · gRPC :8080", "plan de contrôle · gRPC :8080"), color: NV, lane: "agent",
      what: fr
        ? <>Le cerveau. Une API gRPC qui alloue les sandboxes, donne à chacune une identité restreinte, héberge le moteur de policy + le stockage des identifiants (providers), et expose la CLI <code>openshell</code> destinée à l&apos;opérateur.</>
        : <>The brain. A gRPC API that allocates sandboxes, mints each one a scoped identity, hosts the policy engine + the credential store (providers), and exposes the operator-facing <code>openshell</code> CLI.</>,
      k8s: fr
        ? <>Un <strong>StatefulSet</strong> <code>openshell</code> (SQLite) + un Service. Son <em>compute driver Kubernetes</em> surveille le CRD Sandbox <code>agents.x-k8s.io</code>. En bonne santé = la ligne de log <code>Listing sandboxes from Kubernetes</code>. Joignable dans le cluster via le Service (pas de Route publique dans ce workshop).</>
        : <>A <strong>StatefulSet</strong> <code>openshell</code> (SQLite) + Service. Its <em>Kubernetes compute driver</em> watches the <code>agents.x-k8s.io</code> Sandbox CRD. Healthy = log line <code>Listing sandboxes from Kubernetes</code>. Reached in-cluster via the Service (no public Route in this workshop).</> },
    { id: "sup", label: t("Sandbox Supervisor", "Supervisor de sandbox"), sub: t("one per sandbox", "un par sandbox"), color: PURPLE, lane: "agent",
      what: fr
        ? <>Livré par la gateway à <em>chaque</em> sandbox. Il échange un token de bootstrap contre un JWT de sandbox, relaie exec, logs et synchro de fichiers, vérifie chaque connexion ouverte par l&apos;agent par rapport à la policy, et remplace les placeholders par les vrais secrets en egress.</>
        : <>Delivered by the gateway to <em>every</em> sandbox. It exchanges a bootstrap token for a sandbox JWT, relays exec, logs and file sync, checks every connection the agent opens against the policy, and swaps credential placeholders for real secrets on egress.</>,
      k8s: fr
        ? <>Un pod <code>os-supervisor-…</code> par sandbox, à côté du pod de sandbox <code>default--&lt;name&gt;</code> (dont le conteneur <code>agent</code> exécute la charge de travail). Il se connecte à la gateway via le Service interne au cluster. Pas besoin de SCC privilégiée — les sandboxes tournent sous <code>restricted-v2</code>.</>
        : <>An <code>os-supervisor-…</code> pod per sandbox, next to the sandbox pod <code>default--&lt;name&gt;</code> (whose <code>agent</code> container runs the workload). It dials back to the gateway over the in-cluster Service. No privileged SCC needed — sandboxes run under <code>restricted-v2</code>.</> },
    { id: "harness", label: t("Agent Harness", "Harness de l'agent"), sub: t("Definition · Memory · Skills", "Définition · Mémoire · Skills"), color: BLUE, lane: "agent",
      what: fr
        ? <>L&apos;agent lui-même : sa <strong>Définition</strong> (qui il est), sa <strong>Mémoire</strong> (le workspace) et ses <strong>Skills</strong> (ce qu&apos;il sait faire). Les agents créés par la gateway sont encadrés par le supervisor — Shifty compris : il est créé avec <code>openshell sandbox create</code> et utilise le modèle de workspace d&apos;OpenClaw.</>
        : <>The agent itself: its <strong>Definition</strong> (who it is), <strong>Memory</strong> (the workspace), and <strong>Skills</strong> (what it can do). Gateway-created agents are wrapped by the supervisor — Shifty included: it is created with <code>openshell sandbox create</code> and uses the OpenClaw workspace model.</>,
      k8s: fr
        ? <>Le conteneur <code>agent</code> du Pod de sandbox, qui exécute l&apos;image OpenClaw. Son workspace (<code>IDENTITY.md</code>/<code>SOUL.md</code>/…) vit sur un PVC monté.</>
        : <>The <code>agent</code> container in the sandbox Pod, running the OpenClaw image. Its workspace (<code>IDENTITY.md</code>/<code>SOUL.md</code>/…) lives on a mounted PVC.</> },
    { id: "subs", label: t("Sub-Agents", "Sous-agents"), sub: t("spawned on demand", "lancés à la demande"), color: GREEN, lane: "agent",
      what: fr
        ? <>Les agents peuvent lancer des sous-agents spécialisés (un agent de reconnaissance, un agent de réponse aux incidents) — chacun dans sa propre sandbox, avec sa propre identité et sa propre policy.</>
        : <>Agents can spawn focused sub-agents (a recon agent, an incident responder) — each its own sandbox with its own identity and policy.</>,
      k8s: fr
        ? <>Plus de CR <code>Sandbox</code> → plus de Pods, tous gouvernés par la même gateway. <code>oc get sandboxes -n &lt;your namespace&gt;</code> affiche toute la fleet.</>
        : <>More <code>Sandbox</code> CRs → more Pods, each governed by the same gateway. <code>oc get sandboxes -n &lt;your namespace&gt;</code> shows the whole fleet.</> },
    { id: "tools", label: t("Accelerated Tooling", "Outillage accéléré"), sub: "API · CLI · MCP", color: CYAN, lane: "agent",
      what: fr
        ? <>Les capacités que l&apos;agent atteint <em>à travers le garde-fou</em> : système de fichiers, recherche, Omniverse/CAO, un modèle local — via API, CLI ou serveurs MCP.</>
        : <>The capabilities the agent reaches <em>through the guardrail</em>: filesystem, search, Omniverse/CAD, a local model — via API, CLI, or MCP servers.</>,
      k8s: fr
        ? <>Des Services internes au cluster (par ex. l&apos;API Kubernetes, Prometheus) et des endpoints externes, chacun joignable seulement si la <em>policy</em> de la sandbox autorise ce chemin binaire→hôte.</>
        : <>In-cluster Services (e.g. the Kubernetes API, Prometheus) and external endpoints, each only reachable if the sandbox&apos;s <em>policy</em> allows that binary→host path.</> },

    { id: "policy", label: t("Policy Engine + Validator", "Moteur de policy + validateur"), sub: "deny-by-default", color: AMBER, lane: "guard",
      what: fr
        ? <>Chaque sandbox démarre en deny-all. La policy déclare, par binaire, quels hôtes/méthodes/chemins sont autorisés. Un <strong>validateur</strong> peut proposer des ajouts (drafts) qu&apos;un humain approuve.</>
        : <>Every sandbox starts deny-all. Policy declares, per binary, which hosts/methods/paths are allowed. A draft <strong>validator</strong> can propose additions for a human to approve.</>,
      k8s: fr
        ? <>Le schéma par binaire/méthode/chemin dans <code>policies/</code>, appliqué à la création avec <code>openshell sandbox create --policy</code> (ou rechargé à chaud). Combiné au RBAC et aux SCC d&apos;OpenShift.</>
        : <>The per-binary/method/path schema in <code>policies/</code>, applied at creation with <code>openshell sandbox create --policy</code> (or hot-reloaded). Layered with OpenShift RBAC + SCC.</> },
    { id: "net", label: t("Network Guardrail", "Garde-fou réseau"), sub: t("per-binary egress", "egress par binaire"), color: RED, lane: "guard",
      what: fr
        ? <>Contrôle de l&apos;egress au niveau du noyau : <code>git → github.com ✓</code>, <code>curl → anywhere ✗</code>. Même hôte, décision par binaire — bloque l&apos;exfiltration de données par des canaux inconnus. Instantané, sans redémarrage quand la policy change.</>
        : <>Kernel-level egress control: <code>git → github.com ✓</code>, <code>curl → anywhere ✗</code>. Same host, per-binary — stops data exfil through unknown channels. Instant, no restart on policy change.</>,
      k8s: fr
        ? <>Appliqué au proxy de la sandbox, renforcé par une <strong>NetworkPolicy</strong> OpenShift qui restreint l&apos;ingress/egress du pod. Défense en profondeur avec le moteur de policy ci-dessus.</>
        : <>Enforced at the sandbox proxy, backed by an OpenShift <strong>NetworkPolicy</strong> that restricts pod ingress/egress. Defense-in-depth with the policy engine above.</> },
    { id: "router", label: t("Credential Brokering", "Courtage d'identifiants"), sub: "providers · placeholders", color: CYAN, lane: "guard",
      what: fr
        ? <>Les secrets (une clé de modèle, un token GitHub…) vivent dans la gateway sous forme de <strong>providers</strong>, typés par des <strong>profiles</strong> qui nomment l&apos;hôte, le port et les binaires autorisés. L&apos;agent ne détient jamais qu&apos;un <strong>placeholder</strong> ; le supervisor injecte le vrai secret en egress, uniquement vers l&apos;endpoint autorisé — un placeholder volé ne vaut rien.</>
        : <>Secrets (a model key, a GitHub token…) live in the gateway as <strong>providers</strong>, typed by <strong>profiles</strong> that name the allowed host, port and binaries. The agent only ever holds a <strong>placeholder</strong>; the supervisor injects the real secret on egress, only to the allowed endpoint — a stolen placeholder is worthless.</>,
      k8s: fr
        ? <><code>openshell provider profile import</code> + <code>openshell provider create</code>, puis <code>sandbox create --provider</code> (ou <code>sandbox provider attach</code>). Le profile ajoute l&apos;endpoint à la policy effective de la sandbox ; la clé n&apos;arrive jamais dans la spec du pod.</>
        : <><code>openshell provider profile import</code> + <code>openshell provider create</code>, then <code>sandbox create --provider</code> (or <code>sandbox provider attach</code>). The profile composes the endpoint into the sandbox&apos;s effective policy; the key never lands in the pod spec.</> },
    { id: "model", label: t("Model", "Modèle"), sub: t("local or cloud frontier", "frontier local ou cloud"), color: SLATE, lane: "guard",
      what: fr
        ? <>Là où l&apos;inférence s&apos;exécute réellement : un modèle frontier local (par ex. Nemotron) pour la confidentialité, ou un modèle frontier dans le cloud. L&apos;agent appelle son API native ; l&apos;identifiant est géré par OpenShell.</>
        : <>Where inference actually runs: a local frontier model (e.g. Nemotron) for privacy, or a cloud frontier model. The agent calls its native API; the credential is brokered by OpenShell.</>,
      k8s: fr
        ? <>Pour ce workshop, l&apos;inférence est un <strong>endpoint compatible OpenAI</strong> — dans ce lab, le modèle <code>nemotron</code> servi par OpenShift AI Models-as-a-Service (une API distante fonctionne aussi). Shifty l&apos;appelle directement avec la clé placeholder de son provider attaché ; le supervisor injecte la vraie clé.</>
        : <>For this workshop, inference is an <strong>OpenAI-compatible endpoint</strong> — in this lab, the <code>nemotron</code> model served by OpenShift AI Models-as-a-Service (a remote API works too). Shifty calls it directly with the placeholder key from its attached provider; the supervisor injects the real key.</> },
  ];
}

export function OpenShellRuntime() {
  const t = useT();
  const fr = useLang() === "fr";
  const COMPONENTS = comps(t, fr);
  const [view, setView] = useState<"what" | "k8s">("what");
  const [sel, setSel] = useState<string>("gw");
  const active = COMPONENTS.find((c) => c.id === sel)!;
  const lane = (l: Comp["lane"]) => COMPONENTS.filter((c) => c.lane === l);

  const Chip = ({ c }: { c: Comp }) => (
    <button
      onClick={() => setSel(c.id)}
      className="flex-1 min-w-[130px] rounded-lg border px-3 py-2 text-left transition"
      style={{ borderColor: c.color, background: sel === c.id ? `${c.color}26` : "transparent",
               boxShadow: sel === c.id ? `0 0 0 1px ${c.color}` : "none", opacity: sel === c.id ? 1 : 0.8 }}
    >
      <div className="text-[13px] font-semibold" style={{ color: c.color }}>{c.label}</div>
      <div className="text-[10px] text-[var(--color-fg-mut)]">{c.sub}</div>
    </button>
  );

  return (
    <figure className="my-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <figcaption className="text-sm text-[var(--color-fg-mut)]">{t("Inside the OpenShell runtime — click a component", "Au cœur du runtime OpenShell — cliquez sur un composant")}</figcaption>
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-line-2)] text-xs">
          {(["what", "k8s"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className="px-2.5 py-1 font-medium transition"
              style={{ background: view === v ? "var(--color-nv)" : "transparent",
                       color: view === v ? "#06080b" : "var(--color-fg-dim)" }}>
              {v === "what" ? t("What it is", "Ce que c'est") : t("On OpenShift", "Sur OpenShift")}
            </button>
          ))}
        </div>
      </div>

      {/* the OpenShell box: two lanes */}
      <div className="rounded-xl border-2 p-3" style={{ borderColor: NV }}>
        <div className="mb-2 text-[11px] font-bold" style={{ color: NV }}>OpenShell</div>
        <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-mut)]">{t("Agent path", "Chemin de l'agent")}</div>
        <div className="flex flex-wrap items-stretch gap-2">
          {lane("agent").map((c, i) => (
            <div key={c.id} className="flex flex-1 items-stretch gap-2">
              <Chip c={c} />
              {i < lane("agent").length - 1 && <span className="self-center text-[var(--color-fg-mut)]">→</span>}
            </div>
          ))}
        </div>
        <div className="mb-1 mt-3 text-[10px] uppercase tracking-wide text-[var(--color-fg-mut)]">{t("Guardrail path", "Chemin des garde-fous")}</div>
        <div className="flex flex-wrap items-stretch gap-2">
          {lane("guard").map((c, i) => (
            <div key={c.id} className="flex flex-1 items-stretch gap-2">
              <Chip c={c} />
              {i < lane("guard").length - 1 && <span className="self-center text-[var(--color-fg-mut)]">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* detail panel */}
      <div className="mt-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4 text-sm text-[var(--color-fg-dim)]">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: active.color }}>{active.label}</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: view === "k8s" ? "#6f8fd033" : `${NV}22`, color: view === "k8s" ? BLUE : NV }}>
            {view === "k8s" ? t("on OpenShift", "sur OpenShift") : t("what it is", "ce que c'est")}
          </span>
        </div>
        <div>{view === "k8s" ? active.k8s : active.what}</div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-fg-mut)]">
        {fr
          ? <>Sous le tout : le CRD <code>Sandbox</code> + le contrôleur open source <strong>kubernetes-sigs/agent-sandbox</strong>, qui transforme chaque CR en Pod. OpenShell construit par-dessus la gateway, le supervisor, la policy et le courtage d&apos;identifiants.</>
          : <>Underneath it all: the open-source <strong>kubernetes-sigs/agent-sandbox</strong> <code>Sandbox</code> CRD + controller, which reconciles each CR into a Pod. OpenShell builds the gateway, supervisor, policy, and credential brokering on top.</>}
      </p>
    </figure>
  );
}
