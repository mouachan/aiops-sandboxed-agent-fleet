// Single source of truth for the workshop's parts/lessons nav.
// Each lesson maps to src/content/<slug>.mdx. hasLab → renders the live terminal.
export type Lesson = { slug: string; title: string; blurb: string; minutes: number; hasLab?: boolean; fr?: { title: string; blurb: string } };
export type Part = { id: string; title: string; subtitle: string; accent?: "rh" | "nv"; lessons: Lesson[]; fr?: { title: string; subtitle: string } };

export const CURRICULUM: Part[] = [
  {
    id: "welcome",
    fr: { title: "Partie I · Bienvenue", subtitle: "L'événement, la plateforme, ce qu'il vous faut" },
    title: "Part I · Welcome",
    subtitle: "The event, the platform, what you need",
    lessons: [
      { slug: "welcome", title: "Welcome — Red Hat × NVIDIA", blurb: "Hands-on lab: build a sandboxed AI agent on OpenShift, powered by NVIDIA.", minutes: 5, fr: { title: "Bienvenue — Red Hat × NVIDIA", blurb: "Lab pratique : construire un agent IA en sandbox sur OpenShift, propulsé par NVIDIA." } },
      { slug: "prerequisites", title: "Prerequisites", blurb: "A laptop, a browser, and access to an OpenShift cluster. No GPU needed on your side.", minutes: 4, fr: { title: "Prérequis", blurb: "Un ordinateur portable, un navigateur et un accès à un cluster OpenShift. Pas de GPU de votre côté." } },
    ],
  },
  {
    id: "platform",
    fr: { title: "Partie II · Ce qui tourne déjà", subtitle: "La plateforme pré-déployée pour vous : comment elle a été construite, et comment la lire" },
    title: "Part II · What's Already Running",
    subtitle: "The platform we pre-built for you — how it was made, and how to read it",
    accent: "rh",
    lessons: [
      { slug: "big-picture", title: "The Big Picture", blurb: "OpenShift cluster → OpenShell gateway → your sealed agent → an OpenAI-compatible model endpoint.", minutes: 8, fr: { title: "Vue d'ensemble", blurb: "Cluster OpenShift → gateway OpenShell → votre agent scellé → un endpoint de modèle compatible OpenAI." } },
      { slug: "why-openshift", title: "Why OpenShift", blurb: "Red Hat's enterprise Kubernetes — and why it's the base.", minutes: 7, fr: { title: "Pourquoi OpenShift", blurb: "Le Kubernetes d'entreprise de Red Hat, et pourquoi c'est la base." } },
      { slug: "the-cluster", title: "Your Cluster, Already Up", blurb: "How the stack was deployed — and inspect it live with oc.", minutes: 8, hasLab: true, fr: { title: "Votre cluster, déjà prêt", blurb: "Comment la stack a été déployée, et l'inspecter en direct avec oc." } },
      { slug: "openshell", title: "The OpenShell Gateway", blurb: "The agent control plane: agent-sandbox CRD + the Helm chart + the compute driver — and drive it with the CLI.", minutes: 9, hasLab: true, fr: { title: "La gateway OpenShell", blurb: "Le plan de contrôle des agents : le CRD agent-sandbox, le chart Helm et le compute driver, piloté avec la CLI." } },
    ],
  },
  {
    id: "understand-openshell",
    fr: { title: "Partie III · Comment fonctionne OpenShell", subtitle: "Comprendre et piloter le plan de contrôle avant de construire un agent dessus" },
    title: "Part III · How OpenShell Works",
    subtitle: "Understand and drive the control plane — before you build an agent on it",
    accent: "nv",
    lessons: [
      { slug: "openshell-ops", title: "Control Plane & Policies", blurb: "The gateway, the sandbox CRD, and the deny-by-default policy model that governs every agent.", minutes: 10, hasLab: true, fr: { title: "Plan de contrôle et policies", blurb: "La gateway, le CRD sandbox et le modèle de policy deny-by-default qui gouverne chaque agent." } },
      { slug: "explore", title: "Explore It Hands-On", blurb: "Spin a throwaway sandbox and play with every part: status, logs/audit, policy, providers, forward.", minutes: 12, hasLab: true, fr: { title: "Explorez en pratique", blurb: "Lancez une sandbox jetable et testez chaque brique : status, logs/audit, policy, providers, forward." } },
    ],
  },
  {
    id: "build-agent",
    fr: { title: "Partie IV · Construisez votre agent", subtitle: "Pratique : créer un agent OpenClaw sur la gateway, étape par étape" },
    title: "Part IV · Build Your Agent",
    subtitle: "Hands-on: create an OpenClaw agent on the gateway, step by step",
    accent: "nv",
    lessons: [
      { slug: "inference", title: "Set Your Inference Endpoint", blurb: "Verify your endpoint, model & key, then register them with the gateway as a provider — the agent never holds the key.", minutes: 6, hasLab: true, fr: { title: "Configurez votre endpoint d'inférence", blurb: "Vérifiez votre endpoint, votre modèle et votre clé, puis enregistrez-les comme provider dans la gateway : l'agent ne détient jamais la clé." } },
      { slug: "create-agent", title: "Create Your Agent", blurb: "openshell sandbox create + an egress policy → your own sealed OpenClaw sandbox.", minutes: 10, hasLab: true, fr: { title: "Créez votre agent", blurb: "openshell sandbox create + une policy d'egress → votre propre sandbox OpenClaw scellée." } },
      { slug: "configure", title: "Give It a Brain", blurb: "Stage openclaw.json (real endpoint + placeholder key + gateway auth) and start the OpenClaw gateway inside the sandbox.", minutes: 9, hasLab: true, fr: { title: "Donnez-lui un cerveau", blurb: "Préparez openclaw.json (vrai endpoint + clé placeholder + auth de la gateway) et démarrez la gateway OpenClaw dans la sandbox." } },
      { slug: "access", title: "Open the Agent UI", blurb: "Open the Control UI — bridged out of the seal by openshell forward, exposed via an OpenShift Route.", minutes: 6, hasLab: true, fr: { title: "Ouvrez l'UI de l'agent", blurb: "Ouvrez la Control UI, sortie du sceau par openshell forward et exposée via une Route OpenShift." } },
      { slug: "pairing", title: "Pair Your Browser", blurb: "First open asks for device pairing — approve it: sbox-openclaw devices list / approve.", minutes: 7, hasLab: true, fr: { title: "Appairez votre navigateur", blurb: "La première ouverture demande d'appairer l'appareil : approuvez-le avec approve-browser." } },
      { slug: "chat", title: "Talk to Your Agent", blurb: "Your first conversation — and watch the policy + sandbox in action.", minutes: 7, hasLab: true, fr: { title: "Parlez à votre agent", blurb: "Votre première conversation, en regardant la policy et la sandbox à l'œuvre." } },
    ],
  },
  {
    id: "operate",
    fr: { title: "Partie V · Personnalisez-le et exploitez-le", subtitle: "Identité et isolation, outils et skills, puis le faire tourner comme un vrai agent" },
    title: "Part V · Make It Yours & Operate",
    subtitle: "Give it identity and isolation, extend it with tools & skills, then run it as a real agent",
    accent: "nv",
    lessons: [
      { slug: "soul", title: "Identity & Soul", blurb: "The workspace .md files that ARE the agent's memory and personality.", minutes: 8, hasLab: true, fr: { title: "Identité et soul", blurb: "Les fichiers .md du workspace qui SONT la mémoire et la personnalité de l'agent." } },
      { slug: "into-the-sandbox", title: "Into a Sandbox", blurb: "A sandbox IS a pod — but sealed. exec in two ways and see the isolation.", minutes: 8, hasLab: true, fr: { title: "Dans une sandbox", blurb: "Une sandbox EST un pod, mais scellé : entrez-y de deux façons et constatez l'isolation." } },
      { slug: "web-search", title: "Give It Web Search", blurb: "Turn on free, key-free DuckDuckGo search — governed by the same egress policy.", minutes: 8, hasLab: true, fr: { title: "Donnez-lui la recherche web", blurb: "Activez la recherche DuckDuckGo, gratuite et sans clé, gouvernée par la même policy d'egress." } },
      { slug: "skills", title: "Skills & Governance", blurb: "Install a verified skill from ClawHub, author your own, and govern which skills run.", minutes: 12, hasLab: true, fr: { title: "Skills et gouvernance", blurb: "Installez un skill vérifié depuis ClawHub, écrivez le vôtre et contrôlez quels skills tournent." } },
      { slug: "heartbeat", title: "Heartbeat — Run It Autonomously", blurb: "A scheduled self-prompt turns the agent into an operator that watches on its own.", minutes: 8, hasLab: true, fr: { title: "Heartbeat — laissez-le tourner seul", blurb: "Un auto-prompt planifié transforme l'agent en opérateur qui surveille tout seul." } },
      { slug: "openai-api", title: "OpenAI-Compatible API", blurb: "Expose /v1/chat/completions so any OpenAI client can call your governed agent.", minutes: 8, hasLab: true, fr: { title: "API compatible OpenAI", blurb: "Exposez /v1/chat/completions pour que n'importe quel client OpenAI puisse appeler votre agent gouverné." } },
    ],
  },
  {
    id: "build",
    fr: { title: "Partie VI · Construisez quelque chose d'utile", subtitle: "Le capstone : une fleet de copilotes SRE qui enquête sur un vrai incident" },
    title: "Part VI · Build Something Useful",
    subtitle: "The capstone: an SRE copilot fleet that investigates a real incident",
    accent: "nv",
    lessons: [
      { slug: "what-youll-build", title: "The Challenge: An SRE Copilot Fleet", blurb: "Four sealed agents — logs, metrics, traces, events — each scoped to one backend, combined by a lead analyst to find root cause.", minutes: 8, fr: { title: "Le défi : une fleet de copilotes SRE", blurb: "Quatre agents scellés (logs, metrics, traces, events), chacun limité à un backend, réunis par un analyste pour trouver la cause." } },
      { slug: "fleet-spinup", title: "Spin Up & Give Each a Soul", blurb: "One command brings the fleet up; each agent gets its own IDENTITY/SOUL, a skill, and a policy scoped to just its tool.", minutes: 10, hasLab: true, fr: { title: "Lancez la fleet et donnez une soul à chacun", blurb: "Une commande lance la fleet ; chaque agent reçoit son IDENTITY/SOUL, un skill et une policy limitée à son seul outil." } },
      { slug: "fleet-status", title: "The Fleet, at a Glance", blurb: "One page: every agent's status, the exact egress its policy allows, and its SOUL — proof each policy is specific to its tool.", minutes: 6, hasLab: true, fr: { title: "La fleet en un coup d'œil", blurb: "Une page : le statut de chaque agent, l'egress exact que sa policy autorise et sa SOUL, la preuve que chaque policy est propre à son outil." } },
      { slug: "incident-lab", title: "Orchestrate & Resolve an Incident", blurb: "Deploy an app, break it, let the fleet investigate and recommend a fix — then you review, adjust, and approve the change.", minutes: 14, hasLab: true, fr: { title: "Orchestrez et résolvez un incident", blurb: "Déployez une app, cassez-la, laissez la fleet enquêter et recommander un correctif, puis vérifiez, ajustez et approuvez le changement." } },
      { slug: "orchestration", title: "Under the Hood: How It's Orchestrated", blurb: "The real code and prompts behind the fleet — the fixed plan, each agent's prescribed probe, the cluster-telemetry skill, and the analyst's synthesis. Nothing hidden.", minutes: 10, fr: { title: "Sous le capot : l'orchestration", blurb: "Le vrai code et les vrais prompts de la fleet : le plan fixe, la sonde de chaque agent, le skill cluster-telemetry et la synthèse de l'analyste. Rien de caché." } },
      { slug: "build-your-own", title: "Build Your Own", blurb: "The fleet is a pattern, not a fixed thing — concrete new agents, faults, and skills to extend it with, on your own.", minutes: 8, fr: { title: "Construisez le vôtre", blurb: "La fleet est un pattern, pas un produit figé : de nouveaux agents, pannes et skills concrets pour l'étendre." } },
    ],
  },
  {
    id: "reference",
    fr: { title: "Partie VII · Référence", subtitle: "Une vue live de la fleet, la stack d'observabilité, et que faire quand ça coince" },
    title: "Part VII · Reference",
    subtitle: "A live fleet view, the observability stack, and when something goes sideways",
    lessons: [
      { slug: "live", title: "Live OpenShell", blurb: "Your gateway, sandboxes, logs & policy — read live from the cluster, in this page.", minutes: 4, fr: { title: "Live OpenShell", blurb: "Votre gateway, vos sandboxes, logs et policy, lus en direct depuis le cluster, dans cette page." } },
      { slug: "monitoring", title: "Observability", blurb: "Grafana + Prometheus + Loki + Tempo — pre-deployed; open the fleet dashboards.", minutes: 8, hasLab: true, fr: { title: "Observabilité", blurb: "Grafana + Prometheus + Loki + Tempo, pré-déployés : ouvrez les dashboards de la fleet." } },
      { slug: "troubleshooting", title: "Troubleshooting & FAQ", blurb: "The gotchas we hit so you don't have to.", minutes: 8, hasLab: true, fr: { title: "Dépannage et FAQ", blurb: "Les pièges qu'on a rencontrés, pour que vous les évitiez." } },
      { slug: "resources", title: "Resources & Links", blurb: "Docs, repos, and where to go deeper.", minutes: 4, fr: { title: "Ressources et liens", blurb: "Docs, dépôts, et où aller plus loin." } },
    ],
  },
];

export const ALL_LESSONS: (Lesson & { partId: string; partTitle: string; partTitleFr?: string })[] =
  CURRICULUM.flatMap((p) => p.lessons.map((l) => ({ ...l, partId: p.id, partTitle: p.title, partTitleFr: p.fr?.title })));

export function lessonNeighbors(slug: string) {
  const i = ALL_LESSONS.findIndex((l) => l.slug === slug);
  return {
    prev: i > 0 ? ALL_LESSONS[i - 1] : null,
    next: i >= 0 && i < ALL_LESSONS.length - 1 ? ALL_LESSONS[i + 1] : null,
    current: i >= 0 ? ALL_LESSONS[i] : null,
  };
}

export const FIRST_SLUG = ALL_LESSONS[0]?.slug ?? "welcome";
