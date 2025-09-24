// Simple i18n utility with Italian translations as default
// Extendable to support more locales in the future

import it from '../locales/it.json';

type LocaleDict = Record<string, string>;

const locales: Record<string, LocaleDict> = {
  it: it as LocaleDict,
};

let currentLocale: keyof typeof locales = 'it';

export function setLocale(locale: keyof typeof locales) {
  if (locales[locale]) currentLocale = locale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = locales[currentLocale] || {};
  let text = dict[key] || key;
  if (params) {
    (Object as any).entries(params).forEach(([k, v]: [string, string | number]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

export function getCurrentLocale() {
  return currentLocale;
}

