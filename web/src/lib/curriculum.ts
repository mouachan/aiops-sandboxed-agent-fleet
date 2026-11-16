// Single source of truth for the workshop's parts/lessons nav.
// Each lesson maps to src/content/<slug>.mdx. hasLab → renders the live terminal.
export type Lesson = { slug: string; title: string; blurb: string; minutes: number; hasLab?: boolean; fr?: { title: string; blurb: string } };
export type Part = { id: string; title: string; subtitle: string; accent?: "rh" | "nv"; lessons: Lesson[]; fr?: { title: string; subtitle: string } };

export const CURRICULUM: Part[] = [
  {
    id: "welcome",
    fr: { title: "Partie I · Bienvenue", subtitle: "L'événement, la plateforme et ce dont vous avez besoin" },
    title: "Part I · Welcome",
    subtitle: "The event, the platform, what you need",
    lessons: [
      { slug: "welcome", title: "Welcome — Red Hat × NVIDIA", blurb: "Hands-on lab: build a sandboxed AI agent on OpenShift, powered by NVIDIA.", minutes: 5, fr: { title: "Bienvenue — Red Hat × NVIDIA", blurb: "Un lab pratique pour construire un agent IA en sandbox sur OpenShift, avec la technologie NVIDIA." } },
      { slug: "prerequisites", title: "Prerequisites", blurb: "A laptop, a browser, and access to an OpenShift cluster. No GPU needed on your side.", minutes: 4, fr: { title: "Prérequis", blurb: "Un ordinateur portable, un navigateur et un accès à un cluster OpenShift. Aucun GPU nécessaire de votre côté." } },
    ],
  },
  {
    id: "platform",
    fr: { title: "Partie II · Ce qui est déjà en place", subtitle: "La plateforme préparée pour vous : comment elle a été déployée et comment la lire" },
    title: "Part II · What's Already Running",
    subtitle: "The platform we pre-built for you — how it was made, and how to read it",
    accent: "rh",
    lessons: [
      { slug: "big-picture", title: "The Big Picture", blurb: "OpenShift cluster → OpenShell gateway → your sealed agent → an OpenAI-compatible model endpoint.", minutes: 8, fr: { title: "Vue d'ensemble", blurb: "Du cluster OpenShift au modèle : la gateway OpenShell, votre agent isolé et un endpoint compatible OpenAI." } },
      { slug: "why-openshift", title: "Why OpenShift", blurb: "Red Hat's enterprise Kubernetes — and why it's the base.", minutes: 7, fr: { title: "Pourquoi OpenShift", blurb: "Le Kubernetes d'entreprise de Red Hat, et pourquoi c'est le bon socle." } },
      { slug: "the-cluster", title: "Your Cluster, Already Up", blurb: "How the stack was deployed — and inspect it live with oc.", minutes: 8, hasLab: true, fr: { title: "Le cluster, déjà en place", blurb: "Comment la stack a été déployée, et comment l'inspecter en direct avec oc." } },
      { slug: "openshell", title: "The OpenShell Gateway", blurb: "The agent control plane: agent-sandbox CRD + the Helm chart + the compute driver — and drive it with the CLI.", minutes: 9, hasLab: true, fr: { title: "La gateway OpenShell", blurb: "Le plan de contrôle des agents (CRD agent-sandbox, chart Helm, compute driver), que vous pilotez avec la CLI." } },
    ],
  },
  {
    id: "understand-openshell",
    fr: { title: "Partie III · Comprendre OpenShell", subtitle: "Prendre en main le plan de contrôle avant d'y construire un agent" },
    title: "Part III · How OpenShell Works",
    subtitle: "Understand and drive the control plane — before you build an agent on it",
    accent: "nv",
    lessons: [
      { slug: "openshell-ops", title: "Control Plane & Policies", blurb: "The gateway, the sandbox CRD, and the deny-by-default policy model that governs every agent.", minutes: 10, hasLab: true, fr: { title: "Plan de contrôle et policies", blurb: "La gateway, le CRD Sandbox et le modèle de policy deny-by-default qui encadre chaque agent." } },
      { slug: "explore", title: "Explore It Hands-On", blurb: "Spin a throwaway sandbox and play with every part: status, logs/audit, policy, providers, forward.", minutes: 12, hasLab: true, fr: { title: "Prise en main", blurb: "Une sandbox jetable pour tout essayer : statut, logs et audit, policy, providers, forward." } },
    ],
  },
  {
    id: "build-agent",
    fr: { title: "Partie IV · Construire votre agent", subtitle: "En pratique : créer un agent OpenClaw sur la gateway, étape par étape" },
    title: "Part IV · Build Your Agent",
    subtitle: "Hands-on: create an OpenClaw agent on the gateway, step by step",
    accent: "nv",
    lessons: [
      { slug: "inference", title: "Set Your Inference Endpoint", blurb: "Verify your endpoint, model & key, then register them with the gateway as a provider — the agent never holds the key.", minutes: 6, hasLab: true, fr: { title: "Configurer l'endpoint d'inférence", blurb: "Vérifier l'endpoint, le modèle et la clé, puis les confier à la gateway sous forme de provider : l'agent ne voit jamais la clé." } },
      { slug: "create-agent", title: "Create Your Agent", blurb: "openshell sandbox create + an egress policy → your own sealed OpenClaw sandbox.", minutes: 10, hasLab: true, fr: { title: "Créer votre agent", blurb: "openshell sandbox create et une policy d'egress : votre propre sandbox OpenClaw isolée." } },
      { slug: "configure", title: "Give It a Brain", blurb: "Stage openclaw.json (real endpoint + placeholder key + gateway auth) and start the OpenClaw gateway inside the sandbox.", minutes: 9, hasLab: true, fr: { title: "Brancher le modèle", blurb: "Préparer openclaw.json (vrai endpoint, clé placeholder, mot de passe de la gateway) et démarrer la gateway OpenClaw dans la sandbox." } },
      { slug: "access", title: "Open the Agent UI", blurb: "Open the Control UI — bridged out of the seal by openshell forward, exposed via an OpenShift Route.", minutes: 6, hasLab: true, fr: { title: "Ouvrir l'interface de l'agent", blurb: "La Control UI sort de la sandbox grâce à openshell forward et à une Route OpenShift." } },
      { slug: "pairing", title: "Pair Your Browser", blurb: "First open asks for device pairing — approve it: sbox-openclaw devices list / approve.", minutes: 7, hasLab: true, fr: { title: "Appairer votre navigateur", blurb: "À la première connexion, l'agent demande d'appairer votre navigateur : vous l'approuvez avec approve-browser." } },
      { slug: "chat", title: "Talk to Your Agent", blurb: "Your first conversation — and watch the policy + sandbox in action.", minutes: 7, hasLab: true, fr: { title: "Discuter avec votre agent", blurb: "Une première conversation, en observant la policy et la sandbox à l'œuvre." } },
    ],
  },
  {
    id: "operate",
    fr: { title: "Partie V · Personnaliser et exploiter l'agent", subtitle: "Lui donner une identité, de nouveaux outils et des skills, puis le faire tourner comme un vrai agent" },
    title: "Part V · Make It Yours & Operate",
    subtitle: "Give it identity and isolation, extend it with tools & skills, then run it as a real agent",
    accent: "nv",
    lessons: [
      { slug: "soul", title: "Identity & Soul", blurb: "The workspace .md files that ARE the agent's memory and personality.", minutes: 8, hasLab: true, fr: { title: "Identité et personnalité", blurb: "Les fichiers .md du workspace sont la mémoire et la personnalité de l'agent." } },
      { slug: "into-the-sandbox", title: "Into a Sandbox", blurb: "A sandbox IS a pod — but sealed. exec in two ways and see the isolation.", minutes: 8, hasLab: true, fr: { title: "À l'intérieur d'une sandbox", blurb: "Une sandbox est un pod, mais isolé : deux façons d'y entrer, et ce que l'isolation change." } },
      { slug: "web-search", title: "Give It Web Search", blurb: "Turn on free, key-free DuckDuckGo search — governed by the same egress policy.", minutes: 8, hasLab: true, fr: { title: "Ajouter la recherche web", blurb: "La recherche DuckDuckGo, gratuite et sans clé, encadrée par la même policy d'egress." } },
      { slug: "skills", title: "Skills & Governance", blurb: "Install a verified skill from ClawHub, author your own, and govern which skills run.", minutes: 12, hasLab: true, fr: { title: "Skills et gouvernance", blurb: "Installer un skill vérifié depuis ClawHub, écrire le vôtre et contrôler quels skills sont actifs." } },
      { slug: "heartbeat", title: "Heartbeat — Run It Autonomously", blurb: "A scheduled self-prompt turns the agent into an operator that watches on its own.", minutes: 8, hasLab: true, fr: { title: "Heartbeat : un agent autonome", blurb: "Un prompt planifié transforme l'agent en opérateur qui surveille tout seul." } },
      { slug: "openai-api", title: "OpenAI-Compatible API", blurb: "Expose /v1/chat/completions so any OpenAI client can call your governed agent.", minutes: 8, hasLab: true, fr: { title: "Une API compatible OpenAI", blurb: "Exposer /v1/chat/completions pour que n'importe quel client OpenAI puisse appeler votre agent, toujours encadré." } },
    ],
  },
  {
    id: "build",
    fr: { title: "Partie VI · Un cas concret", subtitle: "Le projet final : une fleet de copilotes SRE qui enquête sur un vrai incident" },
    title: "Part VI · Build Something Useful",
    subtitle: "The capstone: an SRE copilot fleet that investigates a real incident",
    accent: "nv",
    lessons: [
      { slug: "what-youll-build", title: "The Challenge: An SRE Copilot Fleet", blurb: "Four sealed agents — logs, metrics, traces, events — each scoped to one backend, combined by a lead analyst to find root cause.", minutes: 8, fr: { title: "Le défi : une fleet de copilotes SRE", blurb: "Quatre agents isolés (logs, metrics, traces, events), chacun limité à un seul backend, et un analyste qui en déduit la cause." } },
      { slug: "fleet-spinup", title: "Spin Up & Give Each a Soul", blurb: "One command brings the fleet up; each agent gets its own IDENTITY/SOUL, a skill, and a policy scoped to just its tool.", minutes: 10, hasLab: true, fr: { title: "Lancer la fleet", blurb: "Une seule commande crée la fleet : chaque agent reçoit son IDENTITY/SOUL, un skill et une policy limitée à son outil." } },
      { slug: "fleet-status", title: "The Fleet, at a Glance", blurb: "One page: every agent's status, the exact egress its policy allows, and its SOUL — proof each policy is specific to its tool.", minutes: 6, hasLab: true, fr: { title: "La fleet en un coup d'œil", blurb: "Sur une seule page : l'état de chaque agent, ce que sa policy l'autorise à joindre et sa SOUL." } },
      { slug: "incident-lab", title: "Orchestrate & Resolve an Incident", blurb: "Deploy an app, break it, let the fleet investigate and recommend a fix — then you review, adjust, and approve the change.", minutes: 14, hasLab: true, fr: { title: "Orchestrer et résoudre un incident", blurb: "Déployer une application, la casser, laisser la fleet enquêter et proposer un correctif, puis le vérifier et l'approuver." } },
      { slug: "orchestration", title: "Under the Hood: How It's Orchestrated", blurb: "The real code and prompts behind the fleet — the fixed plan, each agent's prescribed probe, the cluster-telemetry skill, and the analyst's synthesis. Nothing hidden.", minutes: 10, fr: { title: "Sous le capot : l'orchestration", blurb: "Le code et les prompts réels de la fleet : le plan fixe, la probe de chaque agent, le skill cluster-telemetry et la synthèse de l'analyste." } },
      { slug: "build-your-own", title: "Build Your Own", blurb: "The fleet is a pattern, not a fixed thing — concrete new agents, faults, and skills to extend it with, on your own.", minutes: 8, fr: { title: "Aller plus loin", blurb: "La fleet est un modèle réutilisable : des idées concrètes de nouveaux agents, de pannes et de skills." } },
    ],
  },
  {
    id: "reference",
    fr: { title: "Partie VII · Référence", subtitle: "La fleet en direct, la stack d'observabilité et que faire en cas de problème" },
    title: "Part VII · Reference",
    subtitle: "A live fleet view, the observability stack, and when something goes sideways",
    lessons: [
      { slug: "live", title: "Live OpenShell", blurb: "Your gateway, sandboxes, logs & policy — read live from the cluster, in this page.", minutes: 4, fr: { title: "Live OpenShell", blurb: "Votre gateway, vos sandboxes, leurs logs et leur policy, lus en direct depuis le cluster." } },
      { slug: "monitoring", title: "Observability", blurb: "Grafana + Prometheus + Loki + Tempo — pre-deployed; open the fleet dashboards.", minutes: 8, hasLab: true, fr: { title: "Observabilité", blurb: "Grafana, Prometheus, Loki et Tempo, déjà déployés : les dashboards de la fleet." } },
      { slug: "troubleshooting", title: "Troubleshooting & FAQ", blurb: "The gotchas we hit so you don't have to.", minutes: 8, hasLab: true, fr: { title: "Dépannage et FAQ", blurb: "Les pièges que nous avons rencontrés, pour que vous les évitiez." } },
      { slug: "resources", title: "Resources & Links", blurb: "Docs, repos, and where to go deeper.", minutes: 4, fr: { title: "Ressources et liens", blurb: "La documentation, les dépôts et de quoi aller plus loin." } },
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
