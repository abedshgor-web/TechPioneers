import { createContext, useContext, useState, ReactNode } from "react";
import { Lang, t } from "./i18n";

interface LangCtx {
  lang: Lang;
  tr: typeof t.en;
  toggle: () => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: "en",
  tr: t.en,
  toggle: () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>("en");
  const toggle = () => setLang((l) => (l === "en" ? "ar" : "en"));
  return (
    <LanguageContext.Provider value={{ lang, tr: t[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
