"use client";
import { useState, type ReactNode } from "react";
import { useLang, useT } from "@/lib/lang-client";

// Interactive sandbox-policy explorer: the policy YAML on the left, click a section to see
// what it controls, whether it's static (locked at creation) or dynamic (hot-reloadable),
// and where it's enforced. Mirrors the NVIDIA deck's "static vs dynamic controls" +
// "five enforcement layers" slides.

const NV = "#76b900", AMBER = "#e0a800", BLUE = "#6f8fd0", PURPLE = "#a78bfa", RED = "#ef6b6b";

type Sec = {
  id: string; lines: string[]; color: string; kind: "dynamic" | "static" | "note";
  title: string; enforce?: string; detail: ReactNode;
};

type T = (en: string, fr: string) => string;

function secs(t: T, fr: boolean): Sec[] {
  return [
    { id: "deny", color: "#8a93a3", kind: "note", title: "Deny-by-default",
      lines: ["# Deny-by-default: the agent can ONLY reach what's", "# listed here, only via the listed binaries.", ""],
      detail: fr
        ? <>Rien n&apos;est autorisé tant que vous ne l&apos;avez pas permis. Si aucune entrée <code>network_policies</code> ne correspond, la connexion est bloquée et journalisée. Tout le modèle repose là-dessus : chaque capacité s&apos;ajoute explicitement, ligne par ligne.</>
        : <>Nothing is allowed until you allow it. No matching <code>network_policies</code> entry → the connection is blocked and logged. This is the whole posture: capability is opt-in, line by line.</> },
    { id: "net", color: NV, kind: "dynamic", title: "network_policies", enforce: t("OPA, on every connection", "OPA, à chaque connexion"),
      lines: ["network_policies:", "  github:              # a map keyed by rule name"],
      detail: fr
        ? <>Des blocs nommés d&apos;egress autorisé (ici, un agent qui peut joindre l&apos;API GitHub et rien d&apos;autre). <strong>Dynamique</strong> : après modification, <code>openshell policy set</code> les applique en hot-reload sur la sandbox en cours d&apos;exécution, sans redémarrage. Chaque bloc regroupe endpoints, binaries et rules.</>
        : <>Named blocks of allowed egress (here, an agent that may reach the GitHub API and nothing else). <strong>Dynamic</strong> — edit and <code>openshell policy set</code> hot-reloads it on a running sandbox, no restart. Each block = endpoints + binaries + rules.</> },
    { id: "ep", color: BLUE, kind: "dynamic", title: "endpoints", enforce: t("L7 proxy", "proxy L7"),
      lines: ["    endpoints:", "      - host: api.github.com", "        port: 443", "        protocol: rest", "        enforcement: enforce   # L7 inspect"],
      detail: fr
        ? <>Le host:port que le binaire peut joindre. Avec <code>enforcement: enforce</code>, l&apos;inspection est L7 : le proxy examine les méthodes et les chemins (les <code>rules</code> ci-dessous). Avec <code>access: full</code> à la place, on obtient un tunnel L4 (TLS brut, pour les gestionnaires de paquets), sans inspection des règles.</>
        : <>Which host:port the binary may reach. <code>enforcement: enforce</code> = L7 — the proxy inspects methods/paths (the <code>rules</code> below). <code>access: full</code> instead = an L4 tunnel (raw TLS, for package managers) with no rule inspection.</> },
    { id: "bin", color: AMBER, kind: "dynamic", title: "binaries", enforce: "/proc/<pid>/exe SHA-256",
      lines: ["    binaries:", "      - path: /usr/bin/node", "      - path: /usr/local/bin/node"],
      detail: fr
        ? <>QUELS exécutables peuvent utiliser cet endpoint : le proxy lit <code>/proc/&lt;pid&gt;/exe</code> et calcule l&apos;empreinte SHA-256 du binaire appelant (trust-on-first-use). <code>git → github ✓</code>, mais <code>curl → anywhere ✗</code> : c&apos;est ce qui empêche l&apos;exfiltration de données par un binaire inattendu.</>
        : <>WHICH executables may use this endpoint — the proxy reads <code>/proc/&lt;pid&gt;/exe</code> and SHA-256-hashes the calling binary (trust-on-first-use). <code>git → github ✓</code> but <code>curl → anywhere ✗</code>: this is what stops data exfil through an unexpected binary.</> },
    { id: "rules", color: PURPLE, kind: "dynamic", title: "rules", enforce: t("L7 method+path", "méthode et chemin (L7)"),
      lines: ["        rules:              # under the endpoint", "          - allow: { method: GET, path: /repos/** }"],
      detail: fr
        ? <>L&apos;allowlist L7 : uniquement ces méthodes HTTP et ces motifs de chemins. Un copilote en lecture seule reçoit <code>GET /api/**</code> et rien d&apos;autre ; même détourné, l&apos;agent ne peut donc pas faire de <code>DELETE</code>. Les <code>deny_rules</code> permettent d&apos;exclure des cas précis d&apos;une autorisation plus large.</>
        : <>The L7 allow-list: only these HTTP methods + path globs. A read-only copilot gets <code>GET /api/**</code> and nothing else — so even a hijacked agent can&apos;t <code>DELETE</code>. <code>deny_rules</code> carve exceptions out of a broader allow.</> },
    { id: "fs", color: RED, kind: "static", title: "filesystem_policy", enforce: t("Landlock LSM (kernel)", "Landlock LSM (noyau)"),
      lines: ["filesystem_policy:", "  read_only:  [/usr, /lib, /etc]", "  read_write: [/sandbox, /tmp, /var/tmp]"],
      detail: fr
        ? <>Appliqué par le noyau via <strong>Landlock LSM</strong> : les chemins non listés sont tout simplement inaccessibles, sous la couche applicative. Protège contre l&apos;altération des binaires et le vol d&apos;identifiants. <strong>Statique</strong> : verrouillé à la création ; le modifier recrée la sandbox.</>
        : <>Kernel-enforced via <strong>Landlock LSM</strong> — paths not listed are simply inaccessible, below the app layer. Guards against binary tampering + credential theft. <strong>Static</strong>: locked at creation; changing it recreates the sandbox.</> },
    { id: "proc", color: "#22d3ee", kind: "static", title: "process", enforce: t("seccomp-BPF + privilege drop", "seccomp-BPF + abandon des privilèges"),
      lines: ["process:", "  run_as_user: sandbox      # non-root", "  run_as_group: sandbox"],
      detail: fr
        ? <>S&apos;exécute sous un utilisateur non-root (setuid/setgid abandonnés, impossible de redevenir root), avec un filtre <strong>seccomp-BPF</strong> qui bloque les syscalls dangereux (et <code>PR_SET_NO_NEW_PRIVS</code>). Protège contre l&apos;élévation de privilèges et les fork bombs. <strong>Statique</strong> : verrouillé à la création.</>
        : <>Runs as a non-root user (setuid/setgid drop; re-acquiring root fails) with a <strong>seccomp-BPF</strong> filter blocking dangerous syscalls (and <code>PR_SET_NO_NEW_PRIVS</code>). Guards against priv-esc + fork bombs. <strong>Static</strong>: locked at creation.</> },
  ];
}

export function PolicyExplorer() {
  const t = useT();
  const fr = useLang() === "fr";
  const SECS = secs(t, fr);
  const [sel, setSel] = useState("net");
  const a = SECS.find((s) => s.id === sel)!;
  const tag = (k: Sec["kind"]) =>
    k === "dynamic" ? { t: t("DYNAMIC · hot-reload", "DYNAMIQUE · hot-reload"), c: NV } : k === "static" ? { t: t("STATIC · locked at creation", "STATIQUE · verrouillé à la création"), c: AMBER } : { t: "", c: "#8a93a3" };

  return (
    <figure className="my-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <figcaption className="mb-3 text-sm text-[var(--color-fg-mut)]">{t("A sandbox policy, section by section — click any block", "Une policy de sandbox, section par section : cliquez sur un bloc")}</figcaption>
      <div className="grid gap-3 lg:grid-cols-2">
        {/* the YAML */}
        <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-2)] py-2 font-mono text-[12px] leading-relaxed">
          {SECS.map((s) => (
            <button key={s.id} onClick={() => setSel(s.id)}
              className="block w-full px-3 py-0.5 text-left transition"
              style={{ background: sel === s.id ? `${s.color}1f` : "transparent",
                       borderLeft: `3px solid ${sel === s.id ? s.color : "transparent"}` }}>
              {s.lines.map((ln, i) => (
                <div key={i} className="whitespace-pre" style={{ color: ln.trim().startsWith("#") ? "var(--color-fg-mut)" : "var(--color-fg-dim)" }}>{ln || " "}</div>
              ))}
            </button>
          ))}
        </div>
        {/* the explanation */}
        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4 text-sm text-[var(--color-fg-dim)]">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: a.color }}>{a.title}</span>
            {a.kind !== "note" && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${tag(a.kind).c}22`, color: tag(a.kind).c }}>{tag(a.kind).t}</span>
            )}
            {a.enforce && <span className="rounded bg-[var(--color-panel)] px-1.5 py-0.5 text-[10px] text-[var(--color-fg-mut)]">{t("enforced:", "contrôle :")} {a.enforce}</span>}
          </div>
          <div>{a.detail}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-fg-mut)]">
        {fr
          ? <>Deux familles de règles : les <strong>network_policies</strong> se mettent à jour en hot-reload sur une sandbox en cours d&apos;exécution, tandis que <strong>filesystem</strong> et <strong>process</strong> sont verrouillés à la création (au niveau du noyau, avec Landlock et seccomp). Ensemble, ils forment la defense in depth qui encadre un agent autonome.</>
          : <>Two halves: <strong>network_policies</strong> hot-reload on a running sandbox; <strong>filesystem</strong> + <strong>process</strong> lock at creation (kernel-level: Landlock + seccomp). Together that&apos;s the defense-in-depth that bounds an autonomous agent.</>}
      </p>
    </figure>
  );
}
