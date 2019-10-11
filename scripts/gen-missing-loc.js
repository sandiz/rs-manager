const fs = require('fs');
const child_process = require('child_process');
const languages = require('../src/app-config/base-config').languages;

const root = '../src/'
const wcCmd = `find ${root} -name \"*.js\" | grep -v node_modules/ | grep -v deni | xargs grep -o -E -w --no-filename \"t\\((\\\"|').*?(\\\"|')\\)\" | sort -u  --ignore-case| wc -l`
const allKeys = `find ${root} -name \"*.js\" | grep -v node_modules/ | grep -v deni| xargs grep -o -E -w --no-filename \"t\\((\\\"|').*?(\\\"|')\\)\" | tr -s ' ' | tr '\\\"' \"'\" | grep -oE \"'.*'\" | tr \"'\" \" \" | tr -s \" \" | sort -u  --ignore-case`;



async function getTranslations() {
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

    const enJSON = JSON.parse(fs.readFileSync(`../locales/en/translation.json`));
    console.log("english translation keys => ", Object.keys(enJSON).length);
    for (let k = 0; k < languages.length; k += 1) {
        const lang = languages[k];
        if (lang === 'en') continue;

        console.log(`\ngenerating missing loc for '${lang}'..`);

        // open lang json
        let langJSON = null;
        try {
            langJSON = JSON.parse(fs.readFileSync(`../locales/${lang}/translation.json`));
        }
        catch (e) {
            langJSON = {};
        }
        // iterate over missing json
        const enKeys = Object.keys(enJSON);
        const toTranslate = [];

        for (let i = 0; i < enKeys.length; i += 1) {
            const enKey = enKeys[i];
            if (enKey in langJSON) {
            }
            else {
                const obj = {};
                obj[enKey] = enJSON[enKey];
                toTranslate.push(obj);
            }
        }
        console.log('# keys to translate =>', toTranslate.length);
        if (toTranslate.length == 0)
            continue;
        const toTranslateArr = toTranslate.map(v => Object.values(v)[0]);
        let translations = [];
        try {
            translations = await translate(toTranslateArr, lang);
        }
        catch (e) {
            console.log("exception when trying to translate: " + e);
        }
        if (translations.length === 0) {
            console.log("no translations available, bailing");
            return;
        }
        for (let i = 0; i < toTranslate.length; i += 1) {
            const key = Object.keys(toTranslate[i])[0];
            let translated = "";
            if (Array.isArray(translations))
                translated = translations[i].translatedText;
            else
                translated = translations.translatedText;

            langJSON[key] = translated;
        }
        console.log(`finished ${lang} translations, # keys => `, Object.keys(langJSON).length);
        //save to json
        fs.writeFileSync(`../locales/${lang}/translation.json`, JSON.stringify(langJSON, null, "\t"))
    }
}

function getMissingLocsFromEnglish() {
    const wcOutput = child_process.execSync(wcCmd, {
    });
    const numLocs = parseInt(wcOutput.toString().trim());
    console.log("# of t('calls')\t=> ", numLocs);

    const allKeyOutput = child_process.execSync(allKeys);
    let keys = allKeyOutput.toString().trim().split('\n');
    keys = keys.map(v => v.trim());
    console.log("# of t('keys')\t=> ", keys.length);

    const enFile = `../locales/en/translation.json`;
    const enJSON = JSON.parse(fs.readFileSync(enFile));
    const missing = [];
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (key in enJSON) {
        }
        else {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        console.log("missing lockeys in english (default) =>", missing.length)
        console.log(missing);

        if (process.argv.includes("--update-en-if-reqd")) {
            for (let i = 0; i < missing.length; i += 1) {
                const loc = missing[i];
                enJSON[loc] = loc;
            }
            const enStr = JSON.stringify(enJSON, null, "\t");
            fs.writeFileSync(enFile, enStr);
            console.log("loc file updated =>", enFile);
        }
        else {
            console.log("pass --update-en-if-reqd to update the english translation with default english text")
        }
        process.exit(1);
    }
    else {
        console.log("no missing loc keys found in =>", enFile);
        process.exit(0);
    }
}

if (process.argv.includes("--show-missing-locs-en")) {
    getMissingLocsFromEnglish();
}
else if (process.argv.includes("--generate-translations")) {
    getTranslations();
}
else {
    getMissingLocsFromEnglish();
}
