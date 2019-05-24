const PSARC = require("psarcjs");

async function processPSARC(psarcFile) {
  const psarc = new PSARC(psarcFile);
  await psarc.parse();

  const error = false;
  const exception = null;
  const arrangements = []
  const entries = await psarc.getArrangements();
  const keys = Object.keys(entries);
  try {
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const attr = entries[key];

      if (typeof attr != "object") { continue; }
      const songDict = {}
      songDict.album = "AlbumName" in attr ? attr.AlbumName : ""
      songDict.artist = "ArtistName" in attr ? attr.ArtistName : ""
      songDict.song = "SongName" in attr ? attr.SongName : ""

      songDict.arrangement = "ArrangementName" in attr ? attr.ArrangementName : ""
      if (songDict.arrangement === "Combo") { songDict.arrangement = "LeadCombo" }
      if (songDict.arrangement === "Vocals") { continue }

      songDict.json = attr.srcjson;
      songDict.psarc = path.basename(psarcFile)
      songDict.dlc = "DLC" in attr ? attr.DLC : false;
      songDict.sku = "SKU" in attr ? attr.SKU : "";
      songDict.difficulty = "SongDifficulty" in attr ? attr.SongDifficulty * 100 : 0;
      songDict.dlckey = "DLCKey" in attr ? attr.DLCKey : "";
      songDict.songkey = "SongKey" in attr ? attr.SongKey : "";
      songDict.fullName = "FullName" in attr ? attr.FullName : "";
      songDict.lastConversionTime = "LastConversionDateTime" in attr ? attr.LastConversionDateTime : "";
      songDict.id = "PersistentID" in attr ? attr.PersistentID : "";
      songDict.arrangementProperties = "ArrangementProperties" in attr ? JSON.stringify(attr.ArrangementProperties) : "";
      songDict.capofret = "CapoFret" in attr ? attr.CapoFret : 0;
      songDict.centoffset = "CentOffset" in attr ? attr.CentOffset : 0;
      songDict.tuning = "Tuning" in attr ? JSON.stringify(attr.Tuning) : "";
      songDict.tempo = "SongAverageTempo" in attr ? Math.round(attr.SongAverageTempo) : 0;
      songDict.maxNotes = "Score_MaxNotes" in attr ? Math.round(attr.Score_MaxNotes) : 0;
      songDict.songLength = "SongLength" in attr ? Math.round(attr.SongLength) : 0;
      songDict.phraseIterations = "PhraseIterations" in attr ? JSON.stringify(attr.PhraseIterations) : "";
      arrangements.push(songDict)
    }
  }
  catch (e) {
    error = true
    exception = e
  }
  const psarcData = {
    key: path.basename(psarcFile, ".psarc"),
    files: psarc.getFiles(),
    arrangements,
    exception,
    error,
  }
  return psarcData
}

async function extractFile(psarcFile, fileToExtract) {
  let filename = ""
  try {
    const psarc = new PSARC(psarcFile);
    await psarc.parse();

    filename = os.tmpdir() + "/" + Date.now() + "_" + path.basename(fileToExtract)
    const idx = psarc.getFiles().indexOf(fileToExtract);
    await psarc.extractFile(idx, filename);
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