"use client";
import { Sun, Moon } from "lucide-react";
import { useStoredString } from "@/lib/clientStore";
import { useT } from "@/lib/lang-client";

// The <html data-theme> attribute is set before hydration by the inline script in layout.tsx;
// this button only flips it and remembers the choice.
export function ThemeToggle() {
  const t = useT();
  const [stored, setStored] = useStoredString("oclaw-theme", "dark");
  const theme: "dark" | "light" = stored === "light" ? "light" : "dark";
  const toggle = () => {
    const t = theme === "dark" ? "light" : "dark";
    setStored(t);
    document.documentElement.dataset.theme = t;
    window.dispatchEvent(new CustomEvent("oclaw:theme", { detail: t }));
  };
  return (
    <button onClick={toggle} title={t("Toggle light / dark", "Passer en mode clair ou sombre")} aria-label={t("Toggle theme", "Changer de thème")}
      className="rounded-full border border-[var(--color-line-2)] p-1.5 text-[var(--color-fg-mut)] hover:text-[var(--color-fg)]">
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
