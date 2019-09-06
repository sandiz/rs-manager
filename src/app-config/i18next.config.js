const i18n = require('i18next');
const i18nextBackend = require('i18next-node-fs-backend');
const path = require('path');
const languages = require('./base-config').languages;
const i18nextOptions = {
    backend: {
        // path where resources get loaded from
        loadPath: path.resolve(__dirname, '../../', './locales/{{lng}}/{{ns}}.json'),

        // path to post missing resources
        addPath: path.resolve(__dirname, '../../', './locales/{{lng}}/{{ns}}.missing.json'),

        // jsonIndent to use when storing json files
        jsonIndent: 2,
    },
    interpolation: {
        escapeValue: false,
    },
    saveMissing: false,
    fallbackLng: 'en',
    lng: 'en',
    whitelist: languages,
    react: {
        wait: false,
    },
    namespace: 'translation',
};
//console.log(__dirname);
//console.log(i18nextOptions.backend.loadPath)
i18n
    .use(i18nextBackend);

// initialize if not already initialized
if (!i18n.isInitialized) {
    i18n.init(i18nextOptions, (err, t) => {
        if (err)
            console.log(err);
    });
}

module.exports.i18n = i18n;
