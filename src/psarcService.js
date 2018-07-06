/*
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
*/
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
    const bl = await window.spawn('python', [`${window.dirname}/python/psarc-lib.py`, '-f', psarc])
    return JSON.parse(bl.toString());
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
    const bl = await window.spawn('python', [`${window.dirname}/python/psarc-lib.py`, '-f', psarc, '-e', file])
    return JSON.parse(bl.toString());
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
export default async function readPSARC(psarc, statResult, sleepms) {
  //await sleep(sleepms);
  const ret = await getSongDetails(psarc);
  const psarcData = []
  ret.forEach((item) => {
    const psarcBlurb = item;
    psarcBlurb.size = statResult.size;
    psarcBlurb.created = statResult.ctimeMs;
    psarcBlurb.filename = psarc;
    psarcBlurb.uniquekey = psarcBlurb.filename + "_" + item.fullName
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
