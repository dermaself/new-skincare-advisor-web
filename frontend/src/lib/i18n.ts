// Simple i18n utility with Italian translations as default
// Extendable to support more locales in the future

type LocaleDict = Record<string, string>;

const it: LocaleDict = {
  "steps.gender.title": "Con quale genere ti identifichi?",
  "steps.gender.woman": "Donna",
  "steps.gender.man": "Uomo",
  "steps.gender.nonBinary": "Non binario",
  "steps.gender.preferNot": "Preferisco non specificare",
  "common.next": "Avanti",

  "steps.age.title": "A quale fascia d'età appartieni?",
  "steps.age.18_24": "18-24",
  "steps.age.25_34": "25-34",
  "steps.age.35_44": "35-44",
  "steps.age.45_54": "45-54",
  "steps.age.55_plus": "55+",

  "results.analysis.title": "La tua analisi della pelle",
  "results.analysis.skinType": "Tipo di pelle",
  "results.analysis.acne": "Analisi acne",
  "results.analysis.redness": "Rossore",
  "results.analysis.wrinkles": "Rughe",
  "results.analysis.recommendations": "Raccomandazioni",
  "results.analysis.noneDetected": "Nessuno rilevato",
  "results.recommendations.generated": "Routine personalizzata generata",
  "results.recommendations.suggested": "Routine personalizzata suggerita",

  "routine.tabs.skincare": "Skincare",
  "routine.tabs.weekly": "Settimanale",
  "routine.tabs.makeup": "Makeup",
  "routine.noData.title": "Nessun dato routine disponibile",
  "routine.noData.subtitle": "Per favore riprova l'analisi",
  "routine.restart": "Avvia una nuova analisi",

  "onboarding.title": "Scopri la tua routine skincare perfetta con l'analisi AI",
  "onboarding.privacy.prefix": "Utilizzando questo servizio, accetti la nostra",
  "onboarding.privacy.link": "Informativa sulla Privacy",
  "onboarding.privacy.suffix": ". I tuoi dati saranno trattati in modo sicuro e utilizzati solo per fornire raccomandazioni skincare personalizzate.",
  "onboarding.consent": "Acconsento al trattamento dei miei dati personali per ricevere raccomandazioni skincare personalizzate.",
  "onboarding.start": "Inizia l'analisi",
  "onboarding.loginWith": "Accedi con"
};

const locales: Record<string, LocaleDict> = {
  it: it,
};

let currentLocale: keyof typeof locales = 'it';

export function setLocale(locale: keyof typeof locales) {
  if (locales[locale]) currentLocale = locale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = locales[currentLocale] || {};
  let text = dict[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

export function getCurrentLocale() {
  return currentLocale;
}