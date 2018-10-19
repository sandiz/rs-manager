const Parser = require("binary-parser").Parser
const aesjs = require('aes-js');
const zlib = require('zlib')
const fs = require('fs')
const { promisify } = require('util');
const path = require('path')
//const crypto = require("crypto")

const openFD = promisify(fs.open)
const readFD = promisify(fs.read)
const BLOCK_SIZE = 2 ** 16;
const ARC_KEY = "C53DB23870A1A2F71CAE64061FDD0E1157309DC85204D4C5BFDF25090DF2572C"
const ARC_IV = "E915AA018FEF71FC508132E4BB4CEB42"
const MAC_KEY = "9821330E34B91F70D0A48CBD625993126970CEA09192C0E6CDA676CC9838289D"
const WIN_KEY = "CB648DF3D12A16BF71701414E69619EC171CCA5D2A142E3E59DE7ADDA18A3A30"

const writeFile = (filePath, data) => new Promise((resolve, reject) => {
  fs.writeFile(filePath, data, (err) => {
    if (err) reject(err);
    else resolve();
  });
});
const readFile = filePath => new Promise((resolve, reject) => {
  fs.readFile(filePath, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
const unzip = data => new Promise((resolve, reject) => {
  zlib.unzip(data, {
  }, (err, buffer) => {
    if (!err) {
      resolve(buffer)
    } else {
      reject(err)
    }
  });
});
const mod = (x, n) => (x % n + n) % n

function pad(buffer, blocksize = 16) {
  const size = mod((blocksize - buffer.length), blocksize)
  const b = Buffer.alloc(size)
  return Buffer.concat([buffer, b])
}
function aesBomDecrypt(buffer) {
  const key = aesjs.utils.hex.toBytes(ARC_KEY)
  const iv = aesjs.utils.hex.toBytes(ARC_IV)
  const aescfb = new aesjs.ModeOfOperation.cfb(key, iv, 16);
  return aescfb.decrypt(buffer)
}
async function aesPsarcDecrypt(data, key) {
  const iv = new Uint8Array(data.slice(8, 24));
  key = aesjs.utils.hex.toBytes(key)
  const quanta = data.slice(24, data.length - 56)

  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const decrypted = aesCtr.decrypt(pad(quanta));
  //const length = new Uint32Array(decrypted.slice(0, 4))
  let payload = decrypted.slice(4, data.length)
  payload = await unzip(payload)
  return payload
}

const HEADER = Parser.start()
  .string("MAGIC", {
    encoding: "ascii",
    zeroTerminated: false,
    //validate: "PSAR",
    length: 4
  })
  .uint32("VERSION")
  .string("COMPRESSION", {
    encoding: "ascii",
    zeroTerminated: false,
    //validate: "zlib",
    length: 4
  })
  .uint32("header_size")
  .uint32("ENTRY_SIZE")
  .uint32("n_entries")
  .uint32("BLOCK_SIZE")
  .uint32("ARCHIVE_FLAGS")
  .buffer("bom", {
    length: function () {
      return this.header_size - 32;
    }
  })

const ENTRY = Parser.start()
  .string("md5", {
    encoding: "ascii",
    zeroTerminated: false,
    length: 16
  })
  .uint32("zindex")
  .buffer("length", {
    // type: "uint32be",
    length: 5
  })
  .buffer("offset", {
    //type: "uint32be",
    length: 5
  })

function BOM(entries) {
  return Parser.start()
    .array("entries", {
      type: ENTRY,
      length: entries
    })
    .array("zlength", {
      type: "uint16be",
      //lengthInBytes: 16
      readUntil: "eof"
    })
}
async function decryptPsarc(listing, contents) {
  let data = contents;
  if (listing.includes("songs/bin/macos")) {
    data = await aesPsarcDecrypt(contents, MAC_KEY)
  }
  else if (listing.includes("songs/bin/generic")) {
    data = await aesPsarcDecrypt(contents, WIN_KEY)
  }
  return data
}
async function readEntry(data, idx, bomentries) {
  const singlebom = bomentries.entries[idx];
  let entryoffset = singlebom.offset.readUInt32BE(1)
  const entrylength = singlebom.length.readUInt32BE(1)
  const zlength = bomentries.zlength.slice(singlebom.zindex, bomentries.zlength.length)
  let retBuffer = Buffer.alloc(0)
  let length = 0
  for (let i = 0; i < zlength.length; i += 1) {
    const z = zlength[i]
    if (length === entrylength) { break; }

    let buf = Buffer.alloc(z === 0 ? BLOCK_SIZE : z)
    //let { bytesRead, buffer } = await readFD(fd, buf, 0, z === 0 ? BLOCK_SIZE : z, entryoffset)
    let buffer = data.slice(entryoffset, entryoffset + (z === 0 ? BLOCK_SIZE : z));
    entryoffset += (z === 0 ? BLOCK_SIZE : z)
    try {
      buffer = await unzip(buffer)
    }
    catch (E) {
    }
    retBuffer = Buffer.concat([retBuffer, buffer])
    length += buffer.length
  }
  return retBuffer
}
async function readPsarc(psarcFile, fastRead = true) {
  if (psarcFile !== "") {
    const data = await readFile(psarcFile)
    const header = HEADER.parse(data)
    const paddedbom = pad(header.bom)
    const decryptedbom = Buffer.from(aesBomDecrypt(paddedbom))

    const slicedbom = decryptedbom.slice(0, header.bom.length)

    const bomentries = BOM(header.n_entries).parse(slicedbom)
    //console.log(require("util").inspect(bomentries, { depth: null }));

    //const fd = await openFD(psarcFile, "r");
    const rawlisting = await readEntry(data, 0, bomentries)
    const listing = unescape(rawlisting).split("\n");
    const contents = []
    for (let i = 1; i < bomentries.entries.length; i += 1) {
      if (fastRead) {
        if (listing[i - 1].includes("json")) {
          const c = await readEntry(data, i, bomentries)
          contents.push(c)
        }
        else {
          contents.push("")
        }
      }
      else {
        const c = await readEntry(data, i, bomentries)
        contents.push(c)
      }
    }
    const entries = {}
    for (let i = 0; i < listing.length; i += 1) {
      if (fastRead) {
        if (contents[i] === "") {
          entries[listing[i]] = contents[i];
          continue;
        }
      }
      const decrypted = await decryptPsarc(listing[i], contents[i])
      entries[listing[i]] = decrypted;
    }
    return entries;
  }
  return null
}

async function processPSARC(psarcFile) {
  let error = false
  let exception = ""
  let keys = []
  const arrangements = []
  try {
    const entries = await readPsarc(psarcFile, true);// use fast read
    keys = Object.keys(entries);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = entries[keys[i]].toString("utf-8");
      if (value === "") { continue; }
      const json = JSON.parse(value)
      const persistentidkeys = Object.keys(json.Entries);
      for (let j = 0; j < persistentidkeys.length; j += 1) {
        const id = persistentidkeys[j];
        const jval = json.Entries[id]
        const attr = jval.Attributes;
        const songDict = {}
        songDict.album = Object.prototype.hasOwnProperty.call(attr, "AlbumName") ? attr.AlbumName : ""
        songDict.artist = Object.prototype.hasOwnProperty.call(attr, "ArtistName") ? attr.ArtistName : ""
        songDict.song = Object.prototype.hasOwnProperty.call(attr, "SongName") ? attr.SongName : ""
        songDict.arrangement = Object.prototype.hasOwnProperty.call(attr, "ArrangementName") ? attr.ArrangementName : ""
        if (songDict.arrangement === "Combo") { songDict.arrangement = "LeadCombo" }
        if (songDict.arrangement === "Vocals") { continue }
        songDict.json = key
        songDict.psarc = path.basename(psarcFile)
        songDict.dlc = Object.prototype.hasOwnProperty.call(attr, "DLC") ? attr.DLC : false;
        songDict.sku = Object.prototype.hasOwnProperty.call(attr, "SKU") ? attr.SKU : "";
        songDict.difficulty = Object.prototype.hasOwnProperty.call(attr, "SongDifficulty") ? attr.SongDifficulty * 100 : 0;
        songDict.dlckey = Object.prototype.hasOwnProperty.call(attr, "DLCKey") ? attr.DLCKey : "";
        songDict.songkey = Object.prototype.hasOwnProperty.call(attr, "SongKey") ? attr.SongKey : "";
        songDict.fullName = Object.prototype.hasOwnProperty.call(attr, "FullName") ? attr.FullName : "";
        songDict.lastConversionTime = Object.prototype.hasOwnProperty.call(attr, "LastConversionDateTime") ? attr.LastConversionDateTime : "";
        songDict.id = Object.prototype.hasOwnProperty.call(attr, "PersistentID") ? attr.PersistentID : "";
        songDict.arrangementProperties = Object.prototype.hasOwnProperty.call(attr, "ArrangementProperties") ? JSON.stringify(attr.ArrangementProperties) : "";
        songDict.capofret = Object.prototype.hasOwnProperty.call(attr, "CapoFret") ? attr.CapoFret : 0;
        songDict.centoffset = Object.prototype.hasOwnProperty.call(attr, "CentOffset") ? attr.CentOffset : 0;
        songDict.tuning = Object.prototype.hasOwnProperty.call(attr, "Tuning") ? JSON.stringify(attr.Tuning) : "";
        songDict.tempo = Object.prototype.hasOwnProperty.call(attr, "SongAverageTempo") ? Math.round(attr.SongAverageTempo) : 0;
        songDict.maxNotes = Object.prototype.hasOwnProperty.call(attr, "Score_MaxNotes") ? Math.round(attr.Score_MaxNotes) : 0;
        songDict.songLength = Object.prototype.hasOwnProperty.call(attr, "SongLength") ? Math.round(attr.SongLength) : 0;
        arrangements.push(songDict)
      }
    }
  }
  catch (e) {
    error = true
    exception = e
  }
  const psarcData = {
    key: path.basename(psarcFile, ".psarc"),
    files: keys,
    arrangements,
    exception,
    error,
  }
  return psarcData
}

async function extractFile(psarcFile, fileToExtract) {
  let filename = ""
  try {
    const entries = await readPsarc(psarcFile, false);
    keys = Object.keys(entries);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = entries[keys[i]];
      if (key === fileToExtract) {
        filename = os.tmpdir() + "/" + Date.now() + "_" + path.basename(fileToExtract)
        await writeFile(filename, value)
      }
    }
  }
  catch (e) {
    error = true
    exception = e
  }
  const psarcData = {
    filename
  }
  return psarcData
}

exports.processPSARC = processPSARC
exports.extractFile = extractFile

/*
handleCmd()
async function handleCmd() {
  const c = await processPSARC(process.argv[2], true)
  console.log(c)
}
*/