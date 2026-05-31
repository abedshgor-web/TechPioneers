import { createContext, useContext, useState, ReactNode } from "react";
import { Lang, t, rtlLangs } from "./i18n";

interface LangCtx {
  lang: Lang;
  tr: typeof t.en;
  setLang: (lang: Lang) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LangCtx>({
  lang: "en",
  tr: t.en,
  setLang: () => {},
  isRTL: false,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>("en");
  const setLang = (l: Lang) => setLangState(l);
  const isRTL = rtlLangs.includes(lang);
  return (
    <LanguageContext.Provider value={{ lang, tr: t[lang], setLang, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
