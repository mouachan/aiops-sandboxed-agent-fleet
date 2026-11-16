"use client";
import { ArchExplorer } from "./ArchExplorer";
import { useLang, useT } from "@/lib/lang-client";

const NV = "#76b900", PURPLE = "#a78bfa", BLUE = "#6f8fd0", GREEN = "#34d399", AMBER = "#e0a800";

export function SandboxFlow() {
  const t = useT();
  const fr = useLang() === "fr";
  return (
    <ArchExplorer
      flow
      title={t("How a new sandbox is born — click each step", "Comment naît une nouvelle sandbox — cliquez sur chaque étape")}
      nodes={[
        { id: "req", label: t("1 · Request", "1 · Demande"), sub: t("Sandbox CR  or  gateway gRPC", "CR Sandbox  ou  gRPC de la gateway"), color: BLUE, detail: fr
          ? <>Vous déclarez la sandbox souhaitée. Deux façons : appliquer une CR <code>Sandbox</code> avec <code>oc</code>, ou — ce que nous faisons dans ce lab — appeler la <strong>gateway OpenShell</strong> (<code>openshell sandbox create</code>, gRPC :8080), qui écrit la CR pour vous (nommée <code>default--&lt;name&gt;</code>) et démarre son supervisor. Dans les deux cas, l&apos;état souhaité devient un objet <code>sandboxes.agents.x-k8s.io</code>.</>
          : <>You declare a desired sandbox. Two ways: apply a <code>Sandbox</code> CR with <code>oc</code>, or — what we do in this lab — call the <strong>OpenShell gateway</strong> (<code>openshell sandbox create</code>, gRPC :8080), which writes the CR for you (named <code>default--&lt;name&gt;</code>) and starts its supervisor. Either way the desired state lands as a <code>sandboxes.agents.x-k8s.io</code> object.</> },
        { id: "reconcile", label: t("2 · Reconcile", "2 · Réconciliation"), sub: t("agent-sandbox controller", "contrôleur agent-sandbox"), color: NV, detail: fr
          ? <>Le <strong>contrôleur agent-sandbox</strong> (ns <code>agent-sandbox-system</code>) surveille les CR Sandbox. Le <strong>compute driver</strong> d&apos;OpenShell aussi (&quot;Listing sandboxes from Kubernetes&quot;). Quand une nouvelle CR apparaît, le contrôleur construit le Pod à partir du <code>podTemplate</code> de la CR.</>
          : <>The <strong>agent-sandbox controller</strong> (ns <code>agent-sandbox-system</code>) watches Sandbox CRs. OpenShell&apos;s <strong>compute driver</strong> watches too (&quot;Listing sandboxes from Kubernetes&quot;). When a new CR appears, the controller builds the Pod from the CR&apos;s <code>podTemplate</code>.</> },
        { id: "schedule", label: t("3 · Schedule", "3 · Planification"), sub: "RBAC · SCC · NetworkPolicy", color: AMBER, detail: fr
          ? <>OpenShift planifie le pod sous les garde-fous du namespace — RBAC, Security Context Constraints et toute NetworkPolicy (deny-by-default pour l&apos;agent). La sandbox ne peut faire que ce que la policy autorise.</>
          : <>OpenShift schedules the pod under the namespace&apos;s guardrails — RBAC, Security Context Constraints, and any NetworkPolicy (deny-by-default for the agent). The sandbox can only do what policy allows.</> },
        { id: "run", label: t("4 · Run", "4 · Exécution"), sub: t("the agent boots", "l'agent démarre"), color: PURPLE, detail: fr
          ? <>Le pod démarre ; la gateway OpenClaw se lance dans la sandbox sur son port privé :30789 et lit son workspace (IDENTITY/SOUL) + sa config. La condition <code>Ready</code> de la CR Sandbox passe à True et la gateway signale la sandbox comme Ready.</>
          : <>The pod starts; the OpenClaw gateway comes up inside the sandbox on its private port :30789 and reads its workspace (IDENTITY/SOUL) + config. The Sandbox CR&apos;s <code>Ready</code> condition turns True and the gateway reports the sandbox Ready.</> },
        { id: "use", label: t("5 · Use", "5 · Utilisation"), sub: t("exec in · or the UI", "exec · ou l'UI"), color: GREEN, detail: fr
          ? <>À vous d&apos;interagir : <code>openshell sandbox exec</code> dans la sandbox pour lancer la CLI de l&apos;agent (le helper <code>sbox-openclaw</code>), ou ouvrez sa Control UI via <code>openshell forward</code>. Supprimez-la avec <code>openshell sandbox delete &lt;name&gt;</code> : la gateway supprime la CR et le contrôleur détruit le pod.</>
          : <>Now you interact: <code>openshell sandbox exec</code> into the sandbox to run the agent CLI (the <code>sbox-openclaw</code> helper), or open its Control UI through <code>openshell forward</code>. Delete it with <code>openshell sandbox delete &lt;name&gt;</code>: the gateway removes the CR and the controller tears the pod down.</> },
      ]}
    />
  );
}
