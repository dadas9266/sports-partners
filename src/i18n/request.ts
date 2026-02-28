import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED_LOCALES = ["tr", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string | undefined): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value;
  const locale: Locale = isValidLocale(raw) ? raw : "tr";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
