const fs = require('fs');
const languages = require('../src/app-config/i18next.config').languages;

const enMissingJSON = JSON.parse(fs.readFileSync(`../locales/en/translation.missing.json`));


if (!('TRANSLATE_API_KEY' in process.env)) {
    console.log("TRANSLATE_API_KEY not found in environment variables");
    process.exit(-1);
}
const googleTranslate = require('google-translate')(process.env.TRANSLATE_API_KEY);

translate = (str, lang) => new Promise((resolve, reject) => {
    googleTranslate.translate(str, lang, function (err, translations) {
        if (err) reject(err);
        else resolve(translations);
    });
})

async function getTranslations() {
    for (let k = 0; k < languages.length; k += 1) {
        const lang = languages[k];
        console.log(`generating missing loc for ${lang}`);

        // open lang json
        let langJSON = null;
        try {
            langJSON = JSON.parse(fs.readFileSync(`../locales/${lang}/translation.json`));
        }
        catch (e) {
            langJSON = {};
        }
        // iterate over missing json
        const missingKeys = Object.keys(enMissingJSON);
        const toTranslate = [];

        for (let i = 0; i < missingKeys.length; i += 1) {
            const missingKey = missingKeys[i];
            toTranslate.push(enMissingJSON[missingKey]);
        }

        let translations = [];
        if (lang == 'en') {

        }
        else {
            translations = await translate(toTranslate, lang);
        }
        for (let i = 0; i < missingKeys.length; i += 1) {
            const missingKey = missingKeys[i];
            const translated = lang === 'en' ? enMissingJSON[missingKey] : translations[i].translatedText;
            langJSON[missingKey] = translated;
        }
        console.log(langJSON);
        //save to json
        fs.writeFileSync(`../locales/${lang}/translation.json`, JSON.stringify(langJSON, null, "\t"))
    }
}

getTranslations();
