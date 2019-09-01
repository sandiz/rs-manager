const i18n = require('i18next');

const reactI18nextModule = require('react-i18next').reactI18nextModule;

// const Backend = require('i18next-xhr-backend').Backend;
// const LanguageDetector = require('i18next-browser-languagedetector');

const languages = require('./base-config').languages;

const i18nextOptions = {
    interpolation: {
        escapeValue: false,
    },
    //debug: true,
    saveMissing: false,
    lng: 'bn',
    fallbackLng: 'en',
    whitelist: languages,
    react: {
        wait: false,
    },
    namespace: 'translation',
};

i18n
    .use(reactI18nextModule)

// initialize if not already initialized
if (!i18n.isInitialized) {
    i18n
        .init(i18nextOptions);
}

module.exports = i18n;
