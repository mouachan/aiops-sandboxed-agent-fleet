import { notFound } from "next/navigation";
import Link from "next/link";
import { ALL_LESSONS, lessonNeighbors } from "@/lib/curriculum";
import { mdxComponents } from "@/mdx-components";
import { LabSplit } from "@/components/LabSplit";
import { Clock, ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ slug: l.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = ALL_LESSONS.find((x) => x.slug === slug);
  const lang = await getLang();
  const title = l ? (lang === "fr" && l.fr ? l.fr.title : l.title) : "Workshop";
  return { title: l ? `${title} · ${tr(lang, "OpenClaw on OpenShift", "OpenClaw sur OpenShift")}` : title };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { current, prev, next } = lessonNeighbors(slug);
  if (!current) notFound();

  const lang = await getLang();
  const fr = lang === "fr";
  const t = (en: string, frText: string) => tr(lang, en, frText);
  const titleOf = (l: { title: string; fr?: { title: string } }) => (fr && l.fr ? l.fr.title : l.title);

  // French text when there is one (src/content/fr/<slug>.mdx), else the English lesson.
  let Content: React.ComponentType<{ components?: typeof mdxComponents }>;
  try {
    const mod = fr
      ? await import(`@/content/fr/${slug}.mdx`).catch(() => import(`@/content/${slug}.mdx`))
      : await import(`@/content/${slug}.mdx`);
    Content = mod.default;
  } catch {
    notFound();
  }

  return (
    <article>
      <div className="mb-6 border-b border-[var(--color-line)] pb-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-nv-bright)]">{fr && current.partTitleFr ? current.partTitleFr : current.partTitle}</div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-fg)] md:text-4xl">{titleOf(current)}</h1>
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-fg-mut)]">
          <span className="flex items-center gap-1"><Clock size={13} /> {current.minutes} min</span>
          {current.hasLab && <span className="flex items-center gap-1 text-[var(--color-nv)]"><FlaskConical size={13} /> {t("hands-on lab", "lab pratique")}</span>}
        </div>
      </div>

      {current.hasLab ? (
        <LabSplit slug={current.slug}><Content components={mdxComponents} /></LabSplit>
      ) : (
        <div className="prose mx-auto max-w-5xl"><Content components={mdxComponents} /></div>
      )}

      <nav className="mt-12 flex items-stretch justify-between gap-4 border-t border-[var(--color-line)] pt-6">
        {prev ? (
          <Link href={`/learn/${prev.slug}`} className="group flex flex-1 flex-col rounded-lg border border-[var(--color-line)] p-4 transition hover:border-[var(--color-nv-dim)]">
            <span className="flex items-center gap-1 text-xs text-[var(--color-fg-mut)]"><ArrowLeft size={12} /> {t("Previous", "Précédent")}</span>
            <span className="mt-1 text-sm font-medium text-[var(--color-fg-dim)] group-hover:text-[var(--color-fg)]">{titleOf(prev)}</span>
          </Link>
        ) : <div className="flex-1" />}
        {next ? (
          <Link href={`/learn/${next.slug}`} className="group flex flex-1 flex-col items-end rounded-lg border border-[var(--color-line)] p-4 text-right transition hover:border-[var(--color-nv-dim)]">
            <span className="flex items-center gap-1 text-xs text-[var(--color-fg-mut)]">{t("Next", "Suivant")} <ArrowRight size={12} /></span>
            <span className="mt-1 text-sm font-medium text-[var(--color-fg-dim)] group-hover:text-[var(--color-fg)]">{titleOf(next)}</span>
          </Link>
        ) : <div className="flex-1" />}
      </nav>
    </article>
  );
}
