
//import { writeFile } from './configService';

//import { writeFile } from './configService'
//const jspack = require("./jspack");
const aesjs = require('aes-js');
const zlib = require('zlib')

const readFile = filePath => new Promise((resolve, reject) => {
  window.electronFS.readFile(filePath, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
const unzip = buffer => new Promise((resolve, reject) => {
  zlib.inflate(buffer, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});

const keya = [
  114, 139, 54, 158, 36, 237, 1, 52,
  118, 133, 17, 2, 24, 18, 175,
  192, 163, 194, 93, 2, 6, 95,
  22, 107, 75, 204, 88, 205, 38, 68, 242, 158,
]

let cachedProfileObj = null;
export default async function readProfile(prfldb, force = false) {
  if (cachedProfileObj && force === false) {
    return cachedProfileObj;
  }
  const data = await readFile(prfldb);
  const aesEcb = new aesjs.ModeOfOperation.ecb(keya);
  const decrypted = aesEcb.decrypt(data.slice(20, data.length))

  try {
    const rawjson = await unzip(decrypted);
    //if (window.isDev) {
    //  await writeFile("/tmp/player_data.json", rawjson)
    //}
    const jsonobj = JSON.parse(new TextDecoder("utf-8").decode(rawjson.slice(0, rawjson.length - 1)))
    cachedProfileObj = jsonobj;
    return jsonobj;
  }
  catch (e) {
    console.log(e);
  }
  return null;
}

export async function getProfileName(prfldb) {
  if (!prfldb || prfldb === '') return '';
  const parsed = window.path.parse(prfldb)
  const localProfiles = parsed.dir + "/LocalProfiles.json";

  const lpdata = await readFile(localProfiles);
  const aesEcb = new aesjs.ModeOfOperation.ecb(keya);
  const decryptedlp = aesEcb.decrypt(lpdata.slice(20, lpdata.length))

  try {
    const lpjson = await unzip(decryptedlp)
    const jsonobj = JSON.parse(new TextDecoder("utf-8").decode(lpjson.slice(0, lpjson.length - 1)))
    const prflDBBase = parsed.name.toUpperCase().split("_PRFLDB")[0];
    const profiles = jsonobj.Profiles;
    for (let i = 0; i < profiles.length; i += 1) {
      const obj = profiles[i];
      if (obj.UniqueID === prflDBBase) {
        return obj.PlayerName;
      }
    }
  }
  catch (e) {
    console.log(e);
  }
  return null;
}
export async function getOwnedPackages(cookie, cookieSess) {
  const c = await window.request(
    "https://store.steampowered.com/dynamicstore/userdata/",
    [`steamLoginSecure=${cookie}`, `sessionid=${cookieSess}`],
    'https://store.steampowered.com',
  );
  return JSON.parse(c);
}

export async function getOwnedHistory(cookie, cookieSess) {
  //const body = "sessionid=819d356d55af59e5ce4efd38";
  const form = {
    sessionid: cookieSess,
    //"cursor[timestamp_newest]": Math.round((new Date()).getTime() / 1000),
  }
  const c = await window.request(
    "https://store.steampowered.com/account/AjaxLoadMoreHistory/",
    [`steamLoginSecure=${cookie}`, `sessionid=${cookieSess}`],
    'https://store.steampowered.com',
    null,
    form,
    "POST",
  );

  //const re1 = /<td class="wht_date">(.*)<\/td>.*
  //<td data-tooltip-text="Click to get help with this purchase.*both">(.*)<\/div>.*<\/td>.*
  //<td class="wht_type ">/gm
  try {
    const d = JSON.parse(c);
    const e = d.html.replace(/(\r\n\t|\n|\r\t)/gm, "").replace(/ +(?= )/g, '').replace(/\t/g, '');
    const test = document.createElement("table");
    test.innerHTML = e;
    const { rows } = test;
    const tuples = []
    for (let i = 0; i < rows.length; i += 1) {
      const date = rows[i].cells[0].innerText
      const items = rows[i].cells[1]
      const divs = items.getElementsByTagName("div");
      for (let j = 0; j < divs.length; j += 1) {
        const divtext = divs[j].innerHTML;
        if (divtext.toLowerCase().includes("rocksmith")) {
          tuples.push([date, divtext]);
        }
      }
    }
    return tuples;
  }
  catch (error) {
    console.log(error)
    return [];
  }
}
export async function getTrackTags(artist, title, trackonly = false) {
  //simple o-b-fus-cation
  const p = "a2V5PWxSbktOaUh4UUFpc1d2VGpOT01oJnNlY3JldD1kYWV6VVhlaktwZlBGbkxtZVNIYVdvQmFEb0t0Y05zTg";
  const artistMappings = {
    Motörhead: "Motorhead",
    Queensrÿche: "Queensryche",
    "Mötley Crüe": "Motley Crue",
    "Thirty Seconds to Mars": "30 Seconds to Mars",
    "Panic! At The Disco": "Panic At The Disco",
    "Against Me!": "Against Me",
    "The Pixies": "Pixies",
    "Slash featuring Myles Kennedy and The Conspirators": "Myles Kennedy",
    "Slash featuring Myles Kennedy": "Myles Kennedy",
    "Queen and David Bowie": "Queen",
    "Santana Feat Rob Thomas": "Santana",
    "B. B. King": "BB King",
    "Albert King with Stevie Ray Vaughan": "Albert King",
    "Brad Paisley ft. Alison Krauss": "Brad Paisley",
    "The Outlaws": "Outlaws",
    "Ghost B.C.": "Ghost",
  };
  const akeys = Object.keys(artistMappings);
  if (akeys.includes(artist)) {
    artist = artistMappings[artist];
    console.log("using normalized artist name, ", artist);
  }
  let url = "";
  if (trackonly) {
    url = `https://api.discogs.com/database/search?track=${escape(title)}&per_page=3&page=1&${atob(p)}`;
  }
  else {
    url = `https://api.discogs.com/database/search?track=${escape(title)}&artist=${escape(artist)}&per_page=3&page=1&${atob(p)}`;
  }
  //console.log("searching for", artist, title);
  //console.log(url);
  const headers = new Headers({
    "User-Agent": "rs-manager",
  });
  const d = await window.fetch(url, {
    method: 'GET',
    headers,
  });
  const text = await d.text();
  if (d.status === 429) {
    console.log("timeout", text);
    return "timeout";
  }
  try {
    const e = JSON.parse(unescape(text));
    if (e.results) {
      if (e.results.length > 0) {
        const masterURL = e.results[0].master_url;
        //console.log("master_url", masterURL);
        if (masterURL != null) {
          const master = masterURL + `?${atob(p)}`;
          const f = await window.fetch(master);
          const g = await f.json();
          const s = g.styles ? g.styles : [];
          const gen = g.genres ? g.genres : [];
          const concat = s.concat(gen);
          const unique = [...new Set(concat)];
          return unique;
        }
        else {
          const res = e.results[0];
          const s = res.style ? res.style : [];
          const gen = res.genre ? res.genre : [];
          const concat = s.concat(gen);
          const unique = [...new Set(concat)];
          return unique;
        }
      }
      else {
        if (!trackonly) {
          const res = await getTrackTags(artist, title, true);
          return res;
        }
      }
    }
  }
  catch (ex) {
    console.log(ex);
    console.log(text);
  }
  return null;
}
