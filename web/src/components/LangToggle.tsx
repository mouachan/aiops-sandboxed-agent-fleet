"use client";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/lang-client";

// FR | EN switch: remembers the choice in a cookie and re-renders the page in that language.
export function LangToggle() {
  const lang = useLang();
  const router = useRouter();
  const pick = (l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-[var(--color-line-2)]" role="group" aria-label="Language">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button key={l} onClick={() => pick(l)} aria-pressed={lang === l}
          className={`px-2 py-1 text-[0.7rem] font-semibold uppercase ${lang === l ? "bg-[var(--color-panel-2)] text-[var(--color-fg)]" : "text-[var(--color-fg-mut)] hover:text-[var(--color-fg)]"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
