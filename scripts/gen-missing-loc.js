const fs = require('fs');
const languages = require('../src/app-config/i18next.config').languages;

const enMissingJSON = JSON.parse(fs.readFileSync(`../locales/en/translation.missing.json`));

translate = (str) => {
    return str;
}

languages.forEach((lang) => {
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

    for (let i = 0; i < missingKeys.length; i += 1) {
        const missingKey = missingKeys[i];
        if (missingKeys in langJSON) {
            console.log(`Skipping key ${missingKey}`)
        }
        else {
            if (lang === "en") {
                langJSON[missingKey] = enMissingJSON[missingKey];
            }
            else {
                langJSON[missingKey] = translate(enMissingJSON[missingKey]);
            }
        }
    }
    console.log(langJSON);
    //save to json
    //fs.writeFileSync(`../locales/${lang}/translation.json`, JSON.stringify(langJSON, null, "\t"))
})
