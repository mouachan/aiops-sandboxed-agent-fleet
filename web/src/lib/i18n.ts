// Workshop languages. The lesson text lives in src/content/<slug>.mdx (English) and
// src/content/fr/<slug>.mdx (French); UI strings use tr()/useT() with both versions inline.
// The language comes from the oclaw-lang cookie (header toggle), else WORKSHOP_DEFAULT_LANG.
export type Lang = "en" | "fr";
export const LANG_COOKIE = "oclaw-lang";
export const asLang = (v: unknown): Lang | null => (v === "fr" || v === "en" ? v : null);
export const tr = (lang: Lang, en: string, fr: string) => (lang === "fr" ? fr : en);
