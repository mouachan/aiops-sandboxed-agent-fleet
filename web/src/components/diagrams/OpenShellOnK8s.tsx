"use client";
import { useState, type ReactNode } from "react";
import { useLang, useT } from "@/lib/lang-client";

// Detailed, interactive "OpenShell on Kubernetes" deployment — modelled on the NVIDIA
// deck's architecture slide. Click any object to see what it is, plus how THIS workshop
// maps to it. Grouped by where things actually live: external clients, the openshell
// namespace (gateway + its state), the agent-sandbox controller, and the sandbox pods.

const NV = "#76b900", BLUE = "#6f8fd0", PURPLE = "#a78bfa", AMBER = "#e0a800",
      GREEN = "#34d399", SLATE = "#94a3b8", CYAN = "#22d3ee", RED = "#ef6b6b";

type N = { id: string; label: string; sub?: string; color: string; what: ReactNode; ours: ReactNode };

type T = (en: string, fr: string) => string;

function nodes(t: T, fr: boolean): Record<string, N> {
  return {
    cli: { id: "cli", label: "CLI / SDK / TUI", sub: "openshell …", color: SLATE,
      what: fr
        ? <>L&apos;interface de l&apos;opérateur : <code>openshell gateway add</code>, <code>sandbox create</code>, <code>policy set</code>, <code>provider create</code>. Elle s&apos;authentifie avec un certificat client mTLS et, en option, un JWT OIDC.</>
        : <>The operator surface. <code>openshell gateway add</code>, <code>sandbox create</code>, <code>policy set</code>, <code>provider create</code>. Authenticates with an mTLS client cert + (optionally) an OIDC JWT.</>,
      ours: fr
        ? <>Installée dans le shell du workshop et enregistrée auprès de la gateway par le Service interne au cluster (pas d&apos;OIDC dans cette configuration de développement).</>
        : <>Installed in the workshop shell and registered against the gateway via the in-cluster Service (no OIDC in this dev setup).</> },
    oidc: { id: "oidc", label: t("OIDC Identity Provider", "Fournisseur d'identité OIDC"), sub: "Keycloak / Entra ID", color: AMBER,
      what: fr
        ? <>Émet des JWT porteurs de claims de rôle, pour que la gateway puisse autoriser chaque méthode (admin ou utilisateur en lecture seule). C&apos;est aussi lui qui gère la connexion à l&apos;OpenShell Console.</>
        : <>Issues JWTs with role claims so the gateway can do per-method authorization (admin vs read-only user). Powers the OpenShell Console login.</>,
      ours: fr
        ? <>Désactivé dans cet atelier : la gateway tourne avec <code>allowUnauthenticatedUsers</code> pour que la CLI fonctionne sans SSO. C&apos;est pour cette raison qu&apos;elle reste interne au cluster ; dans un lab multi-utilisateurs, chaque participant dispose plutôt de sa propre gateway.</>
        : <>Disabled for the workshop — the gateway runs with <code>allowUnauthenticatedUsers</code> so the CLI works with no SSO. That&apos;s why it stays in-cluster; a multi-user lab gives each attendee their own gateway instead.</> },
    grpcroute: { id: "grpcroute", label: "Service", sub: "ClusterIP :8080", color: BLUE,
      what: fr
        ? <>Le trafic gRPC entrant atteint la gateway par un <strong>Service</strong> Kubernetes, éventuellement précédé d&apos;une <strong>Route</strong> OpenShift (TLS edge et HTTP/2) pour l&apos;accès externe.</>
        : <>Inbound gRPC reaches the gateway through a Kubernetes <strong>Service</strong>, optionally fronted by an OpenShift <strong>Route</strong> (edge TLS + HTTP/2) for external access.</>,
      ours: fr
        ? <>ClusterIP uniquement : la Route de la gateway est <strong>désactivée</strong> par défaut, car cette gateway accepte les clients non authentifiés. Le shell et l&apos;API du workshop la joignent à l&apos;adresse <code>http://openshell.&lt;ns&gt;.svc.cluster.local:8080</code>.</>
        : <>ClusterIP only — the gateway Route is <strong>off</strong> by default, because this gateway accepts unauthenticated clients. The workshop shell and API reach it at <code>http://openshell.&lt;ns&gt;.svc.cluster.local:8080</code>.</> },
    gw: { id: "gw", label: "Gateway StatefulSet", sub: t("API · state · policy · credentials", "API · état · policy · identifiants"), color: NV,
      what: fr
        ? <>Le control plane. Il sert l&apos;API gRPC, stocke les identifiants des providers, distribue la policy (y compris les règles apportées par les providers) et <strong>authentifie le supervisor de chaque sandbox</strong>. StatefulSet sur SQLite (ou Deployment HA sur Postgres).</>
        : <>The control plane. Serves the gRPC API, stores provider credentials, delivers policy (including provider-composed rules), and <strong>authenticates each sandbox&apos;s supervisor</strong>. StatefulSet on SQLite (or HA Deployment on Postgres).</>,
      ours: fr
        ? <>StatefulSet <code>openshell</code> (SQLite), OpenShell <strong>0.1.6</strong>, avec <code>disableTls</code> (trafic en clair dans le cluster) par souci de simplicité, sous la SCC par défaut <code>restricted-v2</code>. Son compute driver Kubernetes surveille le CRD Sandbox.</>
        : <>StatefulSet <code>openshell</code> (SQLite), OpenShell <strong>0.1.6</strong>, <code>disableTls</code> (plaintext in-cluster) for simplicity, running under the default <code>restricted-v2</code> SCC. Its Kubernetes compute driver watches the Sandbox CRD.</> },
    pvc: { id: "pvc", label: "PVC", sub: t("durable state", "état persistant"), color: GREEN,
      what: fr
        ? <>Conserve la base SQLite de la gateway (inventaire des sandboxes, révisions de policy, configuration des providers) d&apos;un redémarrage à l&apos;autre.</>
        : <>Persists the gateway&apos;s SQLite DB (sandbox registry, policy revisions, provider config) across restarts.</>,
      ours: fr
        ? <>Créé par le provisionneur de stockage par défaut du cluster.</>
        : <>Bound via the cluster&apos;s default storage provisioner.</> },
    secrets: { id: "secrets", label: "Secrets", sub: t("PKI + SSH handshake", "PKI + handshake SSH"), color: RED,
      what: fr
        ? <>Les clés de signature des JWT de sandbox émis par la gateway, et la PKI mTLS qui sert au handshake du supervisor et au relais exec/SSH.</>
        : <>The gateway-minted sandbox-JWT signing keys + the mTLS PKI used for the supervisor handshake and exec/SSH relay.</>,
      ours: fr
        ? <>Pas de PKI mTLS ici, puisque la gateway tourne en clair dans le cluster : l&apos;identité des sandboxes repose sur la clé de signature JWT de la gateway, montée avec <code>sandboxJwt.secretDefaultMode: 0444</code> pour que le pod de la gateway, qui tourne avec un UID aléatoire, puisse la lire.</>
        : <>No mTLS PKI here (plaintext in-cluster gateway); sandbox identity uses the gateway-minted JWT signing key, mounted with <code>sandboxJwt.secretDefaultMode: 0444</code> so the random-UID gateway pod can read it.</> },
    rbac: { id: "rbac", label: "RBAC", sub: "SA + Role bindings", color: PURPLE,
      what: fr
        ? <>Les ServiceAccounts de la gateway et des sandboxes, avec leurs Roles : ce que le compute driver a le droit de faire (créer des Sandboxes, lire les pods) et ce que le SA de chaque sandbox peut faire.</>
        : <>The gateway + sandbox ServiceAccounts and their Roles — what the compute driver may do (create Sandboxes, read pods) and what each sandbox&apos;s SA may do.</>,
      ours: fr
        ? <>Aucun droit SCC supplémentaire sur OpenShift : la gateway et les sandboxes tournent sous <code>restricted-v2</code>. Le seul droit accordé par le chart à l&apos;échelle du cluster (la lecture des nodes, pour la gateway) porte un nom propre à chaque namespace, ce qui permet à plusieurs gateways de coexister.</>
        : <>No extra OpenShift SCC grants: gateway and sandboxes run under <code>restricted-v2</code>. The chart&apos;s one cluster-scoped grant (a node reader for the gateway) is named per namespace, so several gateways can coexist.</> },
    pki: { id: "pki", label: "pkiInitJob", sub: t("cert bootstrap", "génération des certificats"), color: CYAN,
      what: fr
        ? <>Un hook pre-install (<code>openshell-gateway generate-certs</code>) qui crée dans le cluster les Secrets mTLS serveur et client, ou des Issuers cert-manager pour une rotation automatique.</>
        : <>A pre-install hook (<code>openshell-gateway generate-certs</code>) that creates the server + client mTLS Secrets in-cluster — or cert-manager Issuers for auto-rotation.</>,
      ours: fr
        ? <>Inutile dans cette configuration en clair, interne au cluster. Activez-le (ou cert-manager) en même temps que TLS si vous exposez la gateway.</>
        : <>Not needed for this plaintext in-cluster setup; enable it (or cert-manager) together with TLS when you expose the gateway.</> },
    ctrl: { id: "ctrl", label: t("agent-sandbox controller", "contrôleur agent-sandbox"), sub: "agents.x-k8s.io · CRDs", color: BLUE,
      what: fr
        ? <>L&apos;operator kubernetes-sigs/agent-sandbox. Depuis son propre namespace <code>agent-sandbox-system</code>, il transforme chaque CR <code>Sandbox</code> en Pod (+ PVC).</>
        : <>The kubernetes-sigs/agent-sandbox operator. Reconciles each <code>Sandbox</code> CR into a Pod (+ PVC), in its own <code>agent-sandbox-system</code> namespace.</>,
      ours: fr
        ? <><strong>v1.0.3</strong>, qui sert <code>agents.x-k8s.io/v1beta1</code>, l&apos;API que parle la gateway 0.1.6. Installé une seule fois par cluster et partagé par toutes les gateways.</>
        : <><strong>v1.0.3</strong>, serving <code>agents.x-k8s.io/v1beta1</code> — the API the 0.1.6 gateway speaks. Installed once per cluster, shared by every gateway.</> },
    pod: { id: "pod", label: t("Sandbox Pod", "Pod de sandbox"), sub: t("agent + its supervisor", "agent + son supervisor"), color: PURPLE,
      what: fr
        ? <>Chaque sandbox est un Pod qui exécute le conteneur <strong>agent</strong> (OpenClaw, Claude Code, un claw maison…), encadré par un <strong>supervisor</strong> fourni par la gateway. Le supervisor se connecte à la gateway et confronte chaque connexion ouverte par l&apos;agent à la policy (destination, binaire, puis L7).</>
        : <>Each sandbox is a Pod running the <strong>agent</strong> container (OpenClaw, Claude Code, a custom claw…), governed by a <strong>supervisor</strong> the gateway delivers. The supervisor dials the gateway and checks every connection the agent opens against the policy (destination, binary, then L7).</>,
      ours: fr
        ? <>Créé par <code>openshell sandbox create</code> dans le namespace de la gateway, sous le nom <code>default--&lt;name&gt;</code> (avec un pod <code>os-supervisor-…</code>), à partir de l&apos;image communautaire de sandbox OpenClaw.</>
        : <>Created by <code>openshell sandbox create</code> in the gateway&apos;s own namespace as <code>default--&lt;name&gt;</code> (plus an <code>os-supervisor-…</code> pod), on the community OpenClaw sandbox image.</> },
    guard: { id: "guard", label: t("Network Guardrail + Credential Brokering", "Guardrail réseau et credential brokering"), sub: "egress · placeholders", color: AMBER,
      what: fr
        ? <>Chaque connexion sortante est vérifiée (deny-by-default, binaire par binaire). Les <strong>providers</strong> rattachés ne donnent à la sandbox qu&apos;un identifiant placeholder ; le proxy d&apos;egress le remplace par le vrai secret, uniquement vers l&apos;endpoint autorisé par le provider profile.</>
        : <>Every outbound connection is checked (deny-by-default, per-binary). Attached <strong>providers</strong> give the sandbox only a placeholder credential; the egress proxy swaps in the real secret, only toward the endpoint the provider profile allows.</>,
      ours: fr
        ? <>La configuration OpenClaw de votre agent pointe vers le vrai endpoint compatible OpenAI (dans ce lab, le modèle <code>nemotron</code> servi par OpenShift AI Models-as-a-Service), avec la clé placeholder ; le provider profile n&apos;autorise que cet hôte, et seulement pour <code>node</code>/<code>curl</code>.</>
        : <>Your agent&apos;s OpenClaw config points at the real OpenAI-compatible endpoint (in this lab, the <code>nemotron</code> model served by OpenShift AI Models-as-a-Service) with the placeholder key; the provider profile allows that one host for <code>node</code>/<code>curl</code>.</> },
    addons: { id: "addons", label: t("Optional add-ons", "Add-ons facultatifs"), sub: "Envoy · cert-manager · LB · GPU", color: SLATE,
      what: fr
        ? <>Envoy Gateway (Gateway API + GRPCRoute), cert-manager (rotation automatique des certificats), un Service LoadBalancer (adresse externe et relais SSH) et un device plugin GPU (pour les sandboxes GPU).</>
        : <>Envoy Gateway (Gateway API + GRPCRoute), cert-manager (auto cert rotation), a LoadBalancer Service (external addr + SSH relay), and a GPU device plugin (for GPU sandboxes).</>,
      ours: fr
        ? <>Des Routes exposent le workshop et l&apos;interface de l&apos;agent ; les sandboxes n&apos;utilisent que du CPU (le modèle est servi par OpenShift AI Models-as-a-Service). Les operators d&apos;observabilité d&apos;OpenShift fournissent Prometheus, Loki et Tempo, complétés par un Grafana autonome.</>
        : <>Routes expose the workshop and the agent UI; the sandboxes are CPU-only (the model is served by OpenShift AI Models-as-a-Service). The OpenShift observability operators add Prometheus/Loki/Tempo, plus a standalone Grafana.</> },
  };
}

function Chip({ id, sel, onSelect, w }: { id: string; sel: string; onSelect: (id: string) => void; w?: string }) {
  const t = useT();
  const fr = useLang() === "fr";
  const n = nodes(t, fr)[id];
  return (
    <button onClick={() => onSelect(id)} className={`rounded-lg border px-2.5 py-1.5 text-left transition ${w ?? "w-full"}`}
      style={{ borderColor: n.color, background: sel === id ? `${n.color}26` : "transparent",
               boxShadow: sel === id ? `0 0 0 1px ${n.color}` : "none", opacity: sel === id ? 1 : 0.82 }}>
      <div className="text-[12px] font-semibold leading-tight" style={{ color: n.color }}>{n.label}</div>
      {n.sub && <div className="text-[9.5px] text-[var(--color-fg-mut)]">{n.sub}</div>}
    </button>
  );
}

const Box = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-[var(--color-line-2)] p-2">
    <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[var(--color-fg-mut)]">{title}</div>
    {children}
  </div>
);

export function OpenShellOnK8s() {
  const t = useT();
  const fr = useLang() === "fr";
  const [sel, setSel] = useState("gw");
  const a = nodes(t, fr)[sel];

  return (
    <figure className="my-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <figcaption className="mb-3 text-sm text-[var(--color-fg-mut)]">{fr
        ? <>OpenShell sur OpenShift : cliquez sur un objet (le détail montre comment <em>cet</em> atelier s&apos;y rattache)</>
        : <>OpenShell on OpenShift — click any object (detail shows how <em>this</em> workshop maps to it)</>}</figcaption>
      <div className="grid gap-2 lg:grid-cols-[150px_1fr_140px]">
        {/* external clients */}
        <div className="flex flex-col gap-2">
          <Box title="clients"><div className="space-y-2"><Chip sel={sel} onSelect={setSel} id="cli" /><Chip sel={sel} onSelect={setSel} id="oidc" /></div></Box>
        </div>
        {/* the cluster */}
        <div className="rounded-xl border-2 p-2" style={{ borderColor: SLATE }}>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: SLATE }}>{t("OpenShift cluster", "Cluster OpenShift")}</div>
          <div className="rounded-lg border-2 p-2" style={{ borderColor: NV }}>
            <div className="mb-1 text-[10px] font-bold" style={{ color: NV }}>{t("namespace: <user>-openshell (single: openshell)", "namespace : <user>-openshell (instance unique : openshell)")}</div>
            <div className="mb-2"><Chip sel={sel} onSelect={setSel} id="grpcroute" /></div>
            <div className="mb-2"><Chip sel={sel} onSelect={setSel} id="gw" /></div>
            <div className="mb-2 grid grid-cols-4 gap-1.5"><Chip sel={sel} onSelect={setSel} id="pvc" /><Chip sel={sel} onSelect={setSel} id="secrets" /><Chip sel={sel} onSelect={setSel} id="rbac" /><Chip sel={sel} onSelect={setSel} id="pki" /></div>
            {/* sandboxes land in the SAME namespace as the gateway (sandboxNamespace: "") */}
            <Chip sel={sel} onSelect={setSel} id="pod" />
          </div>
          <div className="mt-2"><Box title="agent-sandbox-system"><Chip sel={sel} onSelect={setSel} id="ctrl" /></Box></div>
          <div className="mt-2"><Chip sel={sel} onSelect={setSel} id="guard" /></div>
        </div>
        {/* add-ons */}
        <div className="flex flex-col gap-2"><Box title={t("cluster add-ons", "add-ons du cluster")}><Chip sel={sel} onSelect={setSel} id="addons" /></Box></div>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4 text-sm text-[var(--color-fg-dim)]">
        <div className="mb-1 text-xs font-semibold" style={{ color: a.color }}>{a.label}</div>
        <div className="mb-2">{a.what}</div>
        <div className="rounded border-l-2 pl-2 text-[13px]" style={{ borderColor: NV }}>
          <span className="text-[10px] font-semibold uppercase" style={{ color: NV }}>{t("in this workshop", "dans cet atelier")}&nbsp;</span>{a.ours}
        </div>
      </div>
    </figure>
  );
}
