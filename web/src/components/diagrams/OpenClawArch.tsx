"use client";
import { ArchExplorer } from "./ArchExplorer";
import { useLang, useT } from "@/lib/lang-client";

const NV = "#76b900", PURPLE = "#a78bfa", BLUE = "#6f8fd0", GREEN = "#34d399", AMBER = "#e0a800";

export function OpenClawArch() {
  const t = useT();
  const fr = useLang() === "fr";
  return (
    <ArchExplorer
      title={t("OpenClaw agent — click a piece to see what it does", "L’agent OpenClaw : cliquez sur un composant pour voir son rôle")}
      nodes={[
        { id: "ui", label: "Control UI / Gateway", sub: t("sandbox-internal :30789", "port 30789, interne à la sandbox"), color: NV, detail: fr
          ? <>L’interface web que vous ouvrez dans le navigateur pour discuter avec l’agent et le piloter. C’est une gateway WebSocket, qui impose aussi une <strong>authentification</strong> (par mot de passe) et un <strong>appairage de l’appareil</strong> pour chaque navigateur. Elle écoute sur le port 30789, dans le namespace réseau privé de la sandbox ; <code>openshell forward</code> la relaie vers l’extérieur et une <code>Route</code> OpenShift l’expose.</>
          : <>The web UI you open in a browser to chat with and steer the agent. It’s a WebSocket gateway; it also enforces <strong>auth</strong> (a password) and <strong>device pairing</strong> for each browser. Listens on port 30789 inside the sandbox’s private network namespace, bridged out by <code>openshell forward</code> and exposed via an OpenShift <code>Route</code>.</> },
        { id: "runtime", label: t("Agent runtime", "Runtime de l’agent"), sub: t("plans · calls tools", "planifie · appelle des outils"), color: PURPLE, detail: fr
          ? <>La boucle de l’agent : il raisonne, appelle des outils et modifie son workspace. Il n’a pas de modèle à lui : il envoie ses prompts au provider d’inférence configuré.</>
          : <>The agent loop: it reasons, calls tools, and edits its workspace. It has no model of its own — it sends prompts to the configured inference provider.</> },
        { id: "config", label: "Config", sub: "~/.openclaw/openclaw.json", color: BLUE, detail: fr
          ? <>Déclare le <em>provider</em> du modèle (baseUrl, apiKey et identifiant du modèle ; compatible OpenAI) ainsi que les valeurs par défaut. Le fichier est accessible en écriture pour que l’onboarding de la Control UI puisse l’enregistrer. Vous le modifierez dans la leçon <strong>Brancher le modèle</strong>.</>
          : <>Declares the model <em>provider</em> (baseUrl + apiKey + model id, OpenAI-compatible) and defaults. Writable, so the Control UI’s onboarding can save it. You’ll edit this in the <strong>Add a Model</strong> lesson.</> },
        { id: "workspace", label: "Workspace", sub: t("PVC · the agent’s memory", "PVC · la mémoire de l’agent"), color: GREEN, detail: fr
          ? <>Un volume persistant qui contient les fichiers de l’agent, dont <code>IDENTITY.md</code>, <code>SOUL.md</code>, <code>AGENTS.md</code> et <code>TOOLS.md</code>. Ces fichiers <em>sont</em> la mémoire et la personnalité de l’agent (voir la leçon <strong>Identité et personnalité</strong>).</>
          : <>A persistent volume holding the agent’s files — including <code>IDENTITY.md</code>, <code>SOUL.md</code>, <code>AGENTS.md</code>, <code>TOOLS.md</code>. These <em>are</em> the agent’s memory and personality (see the <strong>Meet Shifty</strong> lesson).</> },
        { id: "auth", label: t("Auth & pairing", "Authentification et appairage"), sub: t("password + device approve", "mot de passe + approbation de l’appareil"), color: AMBER, detail: fr
          ? <>La gateway tourne avec <code>--auth password</code>. À sa première connexion, un navigateur doit en plus être <strong>appairé</strong>, une seule fois : vous approuvez la demande depuis le shell du lab avec <code>sbox-openclaw devices approve</code> (leçon <strong>Appairer votre navigateur</strong>).</>
          : <>The gateway runs <code>--auth password</code>. A first-time browser also needs one-time <strong>device pairing</strong> — approved from the lab shell with <code>sbox-openclaw devices approve</code> (the <strong>Device Pairing</strong> lesson).</> },
      ]}
    />
  );
}
