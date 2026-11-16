"use client";
import { ArchExplorer } from "./ArchExplorer";
import { useLang, useT } from "@/lib/lang-client";

const RH = "#ff4d4d", NV = "#76b900", BLUE = "#6f8fd0", PURPLE = "#a78bfa", CYAN = "#22d3ee";

export function SecurityLayers() {
  const t = useT();
  const fr = useLang() === "fr";
  return (
    <ArchExplorer
      title={t("Defense in depth — what bounds the agent (click each layer)", "Défense en profondeur — ce qui borne l'agent (cliquez sur chaque couche)")}
      nodes={[
        { id: "ns", label: "Namespace + RBAC", sub: "OpenShift", color: RH, detail: fr
          ? <>L&apos;agent vit dans son propre namespace avec un ServiceAccount restreint. Le RBAC décide quels verbes Kubernetes cette identité peut utiliser — par défaut, presque rien en dehors de sa sandbox. Dans un lab partagé, chaque participant a ses propres namespaces, et même le shell du workshop ne peut pas faire <code>oc exec</code> dans les pods des sandboxes.</>
          : <>The agent lives in its own namespace with a scoped ServiceAccount. RBAC decides what Kubernetes verbs that identity may use — by default, almost nothing outside its sandbox. In a shared lab each attendee gets their own namespaces, and even the workshop shell may not <code>oc exec</code> into sandbox pods.</> },
        { id: "scc", label: "Security Context Constraints", sub: t("non-root · drop caps", "non-root · capabilities retirées"), color: RH, detail: fr
          ? <>Les SCC d&apos;OpenShift obligent l&apos;agent à tourner en <strong>non-root</strong> sous l&apos;UID arbitraire du namespace (<code>restricted-v2</code>), avec <code>allowPrivilegeEscalation: false</code> et <strong>toutes les capabilities Linux retirées</strong>. Pas de montage de l&apos;hôte, pas de mode privilégié — les sandboxes OpenShell 0.1.6 n&apos;ont besoin d&apos;aucune SCC supplémentaire.</>
          : <>OpenShift SCCs force the agent to run <strong>non-root</strong> under the namespace&apos;s arbitrary UID (<code>restricted-v2</code>), with <code>allowPrivilegeEscalation: false</code> and <strong>all Linux capabilities dropped</strong>. No host mounts, no privileged mode — OpenShell 0.1.6 sandboxes need no extra SCC.</> },
        { id: "netpol", label: "NetworkPolicy", sub: t("deny-by-default egress", "egress deny-by-default"), color: BLUE, detail: fr
          ? <>La <code>NetworkPolicy</code> Kubernetes ajoute une barrière au niveau du cluster : dans un lab partagé, un ingress deny-by-default rend la gateway, le registry, les sandboxes et l&apos;app de démo de chaque participant inaccessibles depuis les namespaces des autres participants. L&apos;egress de la sandbox elle-même est contrôlé par le proxy OpenShell (couche suivante).</>
          : <>Kubernetes <code>NetworkPolicy</code> adds a cluster-level fence: in a shared lab, deny-by-default ingress keeps every attendee&apos;s gateway, registry, sandboxes and demo app unreachable from other attendees&apos; namespaces. The sandbox&apos;s own egress is fenced by the OpenShell proxy (next layer).</> },
        { id: "l7", label: t("OpenShell L7 policy", "Policy L7 OpenShell"), sub: t("per-binary/method/path", "par binaire/méthode/chemin"), color: NV, detail: fr
          ? <>Sous le supervisor d&apos;OpenShell, une <strong>policy L7</strong> deny-by-default (le schéma dans <code>policies/</code>) contrôle quels binaires/méthodes/chemins l&apos;agent peut utiliser — bien plus fin que du L4.</>
          : <>When running under OpenShell&apos;s supervisor, a deny-by-default <strong>L7 policy</strong> (the schema in <code>policies/</code>) controls which binaries/methods/paths the agent may use — far finer-grained than L4.</> },
        { id: "mtls", label: t("Credential placeholders", "Placeholders d'identifiants"), sub: t("OpenShell providers", "providers OpenShell"), color: CYAN, detail: fr
          ? <>Les secrets vivent dans la gateway sous forme de <strong>providers</strong> ; l&apos;agent ne détient jamais qu&apos;un <strong>placeholder</strong>, et le supervisor injecte la vraie clé du modèle en egress — uniquement vers l&apos;endpoint autorisé par le provider profile. Même en compromettant l&apos;agent, on n&apos;obtient pas la clé.</>
          : <>Secrets live in the gateway as <strong>providers</strong>; the agent only ever holds a <strong>placeholder</strong>, and the supervisor injects the real model key on egress — only toward the endpoint the provider profile allows. Compromise the agent, you still don&apos;t get the key.</> },
        { id: "runtime", label: t("Runtime isolation", "Isolation du runtime"), sub: t("pod · (gVisor optional)", "pod · (gVisor en option)"), color: PURPLE, detail: fr
          ? <>Ici, l&apos;isolation standard pod/conteneur. Le produit OpenShell complet peut ajouter une <strong>RuntimeClass gVisor (runsc)</strong> pour isoler les syscalls au niveau du noyau — une isolation plus forte, activable en option sur le cluster OpenShift, la même posture qu&apos;en production.</>
          : <>Standard pod/container isolation here. The full OpenShell product can add a <strong>gVisor (runsc) RuntimeClass</strong> for kernel-level syscall sandboxing — stronger isolation optionally enabled on the OpenShift cluster, the same posture used in production fleets.</> },
      ]}
    />
  );
}
