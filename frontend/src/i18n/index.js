import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import uz from './uz.json'
import en from './en.json'
import ru from './ru.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      en: { translation: en },
      ru: { translation: ru },
    },
    fallbackLng: 'uz',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
