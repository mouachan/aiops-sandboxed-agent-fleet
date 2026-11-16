import { cookies } from "next/headers";
import { asLang, LANG_COOKIE, type Lang } from "./i18n";

// Server components: the attendee's choice (cookie), else the instance default (chart value
// workshop.defaultLang → WORKSHOP_DEFAULT_LANG), else English.
export async function getLang(): Promise<Lang> {
  const chosen = asLang((await cookies()).get(LANG_COOKIE)?.value);
  return chosen ?? asLang(process.env.WORKSHOP_DEFAULT_LANG) ?? "en";
}
