"use client";
import { createContext, useContext, type ReactNode } from "react";
import { tr, type Lang } from "./i18n";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

// t("English text", "Texte français") → the string for the current language.
export function useT() {
  const lang = useLang();
  return (en: string, fr: string) => tr(lang, en, fr);
}
