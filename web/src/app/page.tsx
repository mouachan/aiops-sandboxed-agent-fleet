import Link from "next/link";
import { FIRST_SLUG, CURRICULUM } from "@/lib/curriculum";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

export default async function Home() {
  const lang = await getLang();
  const fr = lang === "fr";
  const t = (en: string, frText: string) => tr(lang, en, frText);
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-2)] px-3 py-1 text-xs text-[var(--color-fg-dim)]">
        {t("Hands-on lab", "Lab pratique")} · Red Hat × NVIDIA
      </div>
      {fr ? (
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
          Déployez un agent IA sur <span className="text-[var(--color-rh-bright)]">OpenShift</span>,
          <br />propulsé par <span className="text-[var(--color-nv-bright)]">NVIDIA OpenShell</span> et <span className="text-[var(--color-nv-bright)]">OpenClaw</span>.
        </h1>
      ) : (
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
          Deploy an AI agent on <span className="text-[var(--color-rh-bright)]">OpenShift</span>,
          <br />powered by <span className="text-[var(--color-nv-bright)]">NVIDIA OpenShell</span> and <span className="text-[var(--color-nv-bright)]">OpenClaw</span>.
        </h1>
      )}
      {fr ? (
        <p className="mt-5 max-w-2xl text-lg text-[var(--color-fg-dim)]">
          Déployez un agent IA en sandbox, <strong>Shifty 🦞</strong>, sur votre cluster OpenShift avec un seul chart Helm,
          et pilotez-le depuis un <strong>shell live intégré à cette page</strong>. Ni GPU, ni expérience Kubernetes nécessaires.
        </p>
      ) : (
        <p className="mt-5 max-w-2xl text-lg text-[var(--color-fg-dim)]">
          Deploy a sandboxed AI agent — <strong>Shifty 🦞</strong> — to your OpenShift cluster with a single Helm chart,
          and drive it from a <strong>live shell right in this page</strong>. No GPU, no Kubernetes experience needed.
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/learn/${FIRST_SLUG}`} className="rounded-lg bg-[var(--color-nv)] px-5 py-2.5 font-semibold text-[#06080b] hover:bg-[var(--color-nv-bright)]">{t("Start the workshop →", "Commencer le workshop →")}</Link>
        <Link href="/learn/create-agent" className="rounded-lg border border-[var(--color-line-2)] px-5 py-2.5 font-semibold hover:border-[var(--color-nv)]">{t("Jump to building your agent", "Aller directement à la création de l'agent")}</Link>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {CURRICULUM.map((p) => (
          <div key={p.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
            <div className="text-sm font-bold text-[var(--color-nv-bright)]">{fr && p.fr ? p.fr.title : p.title}</div>
            <div className="mt-1 text-sm text-[var(--color-fg-dim)]">{fr && p.fr ? p.fr.subtitle : p.subtitle}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
