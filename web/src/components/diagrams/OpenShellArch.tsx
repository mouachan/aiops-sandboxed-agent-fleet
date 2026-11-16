"use client";
import { ArchExplorer } from "./ArchExplorer";
import { useLang, useT } from "@/lib/lang-client";

const NV = "#76b900", PURPLE = "#a78bfa", BLUE = "#6f8fd0", GREEN = "#34d399", AMBER = "#e0a800", CYAN = "#22d3ee";

export function OpenShellArch() {
  const t = useT();
  const fr = useLang() === "fr";
  return (
    <ArchExplorer
      title={t("OpenShell isn’t one thing — click each part", "OpenShell n’est pas un bloc unique — cliquez sur chaque partie")}
      nodes={[
        { id: "gw", label: "Gateway", sub: t("control plane · gRPC :8080", "plan de contrôle · gRPC :8080"), color: NV, detail: fr
          ? <>La <strong>gateway</strong> OpenShell — le cerveau. Une application installée par Helm (StatefulSet sur SQLite, ou Deployment HA sur Postgres) qui expose une API gRPC et héberge les briques ci-dessous : le compute driver, le stockage des identifiants (providers), le bootstrap du supervisor, la policy et l&apos;auth mTLS/OIDC.</>
          : <>The OpenShell <strong>gateway</strong> — the brain. A Helm-installed workload (StatefulSet on SQLite, or HA Deployment on Postgres) that exposes a gRPC API and hosts the pieces below: the compute driver, the credential store (providers), supervisor bootstrap, policy, and mTLS/OIDC auth.</> },
        { id: "driver", label: "Compute driver", sub: "Kubernetes", color: BLUE, detail: fr
          ? <>Surveille et crée les sandboxes. Sur <code>openshell sandbox create</code>, il écrit une CR <code>agents.x-k8s.io Sandbox</code> et câble la sandbox. En bonne santé = la ligne de log <code>Listing sandboxes from Kubernetes</code>. D&apos;autres drivers existent ; nous utilisons celui de Kubernetes.</>
          : <>Watches and creates sandboxes. On <code>openshell sandbox create</code> it writes an <code>agents.x-k8s.io Sandbox</code> CR and wires the sandbox up. Healthy = the log line <code>Listing sandboxes from Kubernetes</code>. Other drivers exist; we use the Kubernetes one.</> },
        { id: "l7", label: "Providers", sub: t("profiles · credential placeholders", "profiles · placeholders d'identifiants"), color: CYAN, detail: fr
          ? <>Les secrets vivent dans la gateway sous forme de <strong>providers</strong>, chacun typé par un <strong>provider profile</strong> (hôte + port autorisés, type d&apos;auth, binaires autorisés à l&apos;utiliser). Une sandbox attachée ne voit qu&apos;un <strong>placeholder</strong> (<code>openshell:resolve:env:…</code>) ; le supervisor y substitue la vraie clé en egress, uniquement vers l&apos;endpoint du profile. Faites la rotation de la clé une seule fois dans la gateway : les sandboxes attachées la récupèrent.</>
          : <>Secrets live in the gateway as <strong>providers</strong>, each typed by a <strong>provider profile</strong> (allowed host + port, auth style, the binaries that may use it). An attached sandbox only sees a <strong>placeholder</strong> (<code>openshell:resolve:env:…</code>); the supervisor swaps in the real key on egress, only toward the profile&apos;s endpoint. Rotate the key once at the gateway; attached sandboxes pick it up.</> },
        { id: "supervisor", label: "Supervisor", sub: t("one per sandbox", "un par sandbox"), color: PURPLE, detail: fr
          ? <>Le <strong>supervisor</strong> que la gateway livre à chaque sandbox (sur Kubernetes, un pod <code>os-supervisor-…</code> par sandbox). Il démarre et surveille le processus de l&apos;agent, construit son namespace réseau scellé, applique la policy côté sandbox via son proxy d&apos;egress, et remplace les placeholders par les vrais secrets à la sortie.</>
          : <>The <strong>supervisor</strong> the gateway delivers to every sandbox (on Kubernetes, an <code>os-supervisor-…</code> pod per sandbox). It bootstraps and oversees the agent process, builds its sealed network namespace, enforces the sandbox-side policy through its egress proxy, and swaps credential placeholders for real secrets on the way out.</> },
        { id: "policy", label: "Policy + mTLS", sub: "deny-by-default", color: AMBER, detail: fr
          ? <>Une policy L7 par sandbox (le schéma par binaire/méthode/chemin dans <code>policies/</code>) plus des composants authentifiés (JWT de sandbox émis par la gateway ; la gateway interne de ce workshop tourne en clair). Combinée à la NetworkPolicy et aux SCC d&apos;OpenShift, c&apos;est la défense en profondeur qui borne ce qu&apos;un agent peut faire.</>
          : <>Per-sandbox L7 policy (the per-binary/method/path schema in <code>policies/</code>) plus authenticated components (gateway-minted sandbox JWTs; this workshop&apos;s in-cluster gateway runs plaintext). Combined with OpenShift NetworkPolicy + SCCs, this is the defense-in-depth that bounds what an agent can do.</> },
        { id: "sig", label: "agent-sandbox", sub: t("kubernetes-sigs · the CRD", "kubernetes-sigs · le CRD"), color: GREEN, detail: fr
          ? <>Sous le tout se trouve le projet open source <strong>kubernetes-sigs/agent-sandbox</strong> : le CRD <code>Sandbox</code> (<code>agents.x-k8s.io</code>) + un contrôleur qui transforme une CR en Pod + stockage. OpenShell s&apos;appuie sur cette primitive ; <code>oc get sandboxes</code> montre la fleet comme de simples objets Kubernetes.</>
          : <>Underneath it all is the open-source <strong>kubernetes-sigs/agent-sandbox</strong> project: the <code>Sandbox</code> CRD (<code>agents.x-k8s.io</code>) + a controller that reconciles a CR into a Pod + storage. OpenShell builds on this primitive; <code>oc get sandboxes</code> shows the fleet as plain Kubernetes objects.</> },
      ]}
    />
  );
}
