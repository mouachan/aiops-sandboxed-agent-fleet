"use client";
import { ArchExplorer } from "./ArchExplorer";
import { useLang, useT } from "@/lib/lang-client";

const NV = "#76b900", PURPLE = "#a78bfa", BLUE = "#6f8fd0", GREEN = "#34d399", AMBER = "#e0a800";

export function OpenClawArch() {
  const t = useT();
  const fr = useLang() === "fr";
  return (
    <ArchExplorer
      title={t("OpenClaw agent — click a piece to see what it does", "Agent OpenClaw — cliquez sur une pièce pour voir son rôle")}
      nodes={[
        { id: "ui", label: "Control UI / Gateway", sub: t("sandbox-internal :30789", "interne à la sandbox :30789"), color: NV, detail: fr
          ? <>L’UI web que vous ouvrez dans un navigateur pour discuter avec l’agent et le piloter. C’est une gateway WebSocket ; elle impose aussi l’<strong>authentification</strong> (un mot de passe) et l’<strong>appairage d’appareil</strong> pour chaque navigateur. Elle écoute sur le port 30789 dans le namespace réseau privé de la sandbox, relayée vers l’extérieur par <code>openshell forward</code> et exposée via une <code>Route</code> OpenShift.</>
          : <>The web UI you open in a browser to chat with and steer the agent. It’s a WebSocket gateway; it also enforces <strong>auth</strong> (a password) and <strong>device pairing</strong> for each browser. Listens on port 30789 inside the sandbox’s private network namespace, bridged out by <code>openshell forward</code> and exposed via an OpenShift <code>Route</code>.</> },
        { id: "runtime", label: t("Agent runtime", "Runtime de l’agent"), sub: t("plans · calls tools", "planifie · appelle des outils"), color: PURPLE, detail: fr
          ? <>La boucle de l’agent : il raisonne, appelle des outils et modifie son workspace. Il n’a pas de modèle propre — il envoie ses prompts au provider d’inférence configuré.</>
          : <>The agent loop: it reasons, calls tools, and edits its workspace. It has no model of its own — it sends prompts to the configured inference provider.</> },
        { id: "config", label: "Config", sub: "~/.openclaw/openclaw.json", color: BLUE, detail: fr
          ? <>Déclare le <em>provider</em> du modèle (baseUrl + apiKey + id du modèle, compatible OpenAI) et les valeurs par défaut. Accessible en écriture, pour que l’onboarding de la Control UI puisse l’enregistrer. Vous le modifierez dans la leçon <strong>Ajouter un modèle</strong>.</>
          : <>Declares the model <em>provider</em> (baseUrl + apiKey + model id, OpenAI-compatible) and defaults. Writable, so the Control UI’s onboarding can save it. You’ll edit this in the <strong>Add a Model</strong> lesson.</> },
        { id: "workspace", label: "Workspace", sub: t("PVC · the agent’s memory", "PVC · la mémoire de l’agent"), color: GREEN, detail: fr
          ? <>Un volume persistant qui contient les fichiers de l’agent, dont <code>IDENTITY.md</code>, <code>SOUL.md</code>, <code>AGENTS.md</code>, <code>TOOLS.md</code>. Ces fichiers <em>sont</em> la mémoire et la personnalité de l’agent (voir la leçon <strong>Rencontrez Shifty</strong>).</>
          : <>A persistent volume holding the agent’s files — including <code>IDENTITY.md</code>, <code>SOUL.md</code>, <code>AGENTS.md</code>, <code>TOOLS.md</code>. These <em>are</em> the agent’s memory and personality (see the <strong>Meet Shifty</strong> lesson).</> },
        { id: "auth", label: t("Auth & pairing", "Auth et appairage"), sub: t("password + device approve", "mot de passe + approbation de l’appareil"), color: AMBER, detail: fr
          ? <>La gateway tourne avec <code>--auth password</code>. Un navigateur qui se connecte pour la première fois doit aussi passer un <strong>appairage d’appareil</strong> unique, approuvé depuis le shell du lab avec <code>sbox-openclaw devices approve</code> (leçon <strong>Appairage d’appareil</strong>).</>
          : <>The gateway runs <code>--auth password</code>. A first-time browser also needs one-time <strong>device pairing</strong> — approved from the lab shell with <code>sbox-openclaw devices approve</code> (the <strong>Device Pairing</strong> lesson).</> },
      ]}
    />
  );
}
