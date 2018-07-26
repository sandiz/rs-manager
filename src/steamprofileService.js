//const jspack = require("./jspack");
const aesjs = require('aes-js');
const zlib = require('zlib')

//eslint-disable-next-line
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
export default async function readProfile(prfldb) {
  const data = await readFile(prfldb);
  //const unk1 = jspack.jspack.Unpack('<L', data.slice(16, 20));
  //eslint-disable-next-line
  const aesEcb = new aesjs.ModeOfOperation.ecb(keya);
  const decrypted = aesEcb.decrypt(data.slice(20, data.length))
  //console.log(Buffer.from(keya).toString('hex'));
  try {
    const rawjson = await unzip(decrypted);
    const jsonobj = JSON.parse(new TextDecoder("utf-8").decode(rawjson.slice(0, rawjson.length - 1)))
    return jsonobj;
  }
  catch (e) {
    console.log(e);
  }
  return null;
}
export async function getOwnedPackages(cookie) {
  const c = await window.request(
    "https://store.steampowered.com/dynamicstore/userdata/",
    `steamLoginSecure=${cookie}`,
    'https://store.steampowered.com',
  );

  return JSON.parse(c);
}

export async function getOwnedHistory(cookie) {
  const c = await window.request(
    "https://store.steampowered.com/account/AjaxLoadMoreHistory/",
    `steamLoginSecure=${cookie}`,
    'https://store.steampowered.com',
  );

  //eslint-disable-next-line
  const re1 = /<td class="wht_date">(.*)<\/td>.*<td data-tooltip-text="Click to get help with this purchase.*both">(.*)<\/div>.*<\/td>.*<td class="wht_type ">/gm
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
