/*
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
*/
const fs = window.require('fs');
const util = window.require('util');
const fileStatAsync = util.promisify(fs.stat);

async function getSongDetails(psarc) {
  const arrangementarr = [];
  try {
    const json = await window.processPSARC(psarc)
    if (json.error) {
      console.log("error reading psarc")
      console.log(psarc)
      console.log(json);
    }

    json.arrangements.forEach((arr) => {
      if (arr.song !== '' && arr.artist !== '') {
        arrangementarr.push(arr);
      }
    });
  }
  catch (error) {
    if (error.stderr != null) {
      console.log(error.stderr.toString());
    }
    else {
      console.log(error);
    }
  }

  return arrangementarr;
}
export async function psarcToJSON(psarc) {
  try {
    const json = await window.processPSARC(psarc)
    return json
  }
  catch (error) {
    if (error.stderr != null) {
      console.log(error.stderr.toString());
    }
    else {
      console.log(error);
    }
  }
  return null;
}
export async function extractFile(psarc, file) {
  try {
    const c = await window.extractFile(psarc, file);
    return c;
  }
  catch (error) {
    if (error.stderr != null) {
      console.log(error.stderr.toString());
    }
    else {
      console.log(error);
    }
  }
  return null;
}
export default async function readPSARC(psarc) {
  const ret = await getSongDetails(psarc);
  const statResult = await fileStatAsync(psarc);
  const psarcData = []
  ret.forEach((item) => {
    const psarcBlurb = item;
    psarcBlurb.size = statResult.size;
    psarcBlurb.created = statResult.ctimeMs;
    psarcBlurb.filename = psarc;
    psarcBlurb.uniquekey = psarcBlurb.filename + "_" + item.fullName + "_" + item.id
    /*{
      filename: psarc,
      name: path.basename(psarc, ".psarc"),
      size: statResult.size,
      created: statResult.ctimeMs,
      artist: item.artist,
      song: item.song,
      arrangement: item.arrangement,
      id: item.id,
    };*/
    psarcData.push(psarcBlurb);
  })
  return psarcData;
}
