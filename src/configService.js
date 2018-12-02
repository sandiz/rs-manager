import { defaultSortOption } from "./Components/settingsView";

export const writeFile = (filePath, data) => new Promise((resolve, reject) => {
  window.electronFS.writeFile(filePath, data, (err) => {
    if (err) reject(err);
    else resolve();
  });
});
export const readFile = filePath => new Promise((resolve, reject) => {
  window.electronFS.readFile(filePath, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
let JsonObj = null;
function getDefaultSettings() {
  const obj = {};
  obj.prfldb = ""
  obj.steamLoginSecure = ""
  obj.showScoreAttack = true
  obj.useCDLCinStats = true
  obj.scoreAttackDashboard = [true, true, true, true]; //easy, medium, hard, master
  obj.sessionID = ""
  obj.masteryThreshold = 0.95
  obj.showPSStats = false
  obj.dateFormat = "dhm"
  obj.dateSrc = "rs"
  obj.steamID = ""
  obj.steamAPIKey = ""
  obj.defaultSortOption = defaultSortOption;
  obj.showSetlistOverlayAlways = false;
  return obj;
}
export async function getConfig(type) {
  try {
    if (!window.electronFS.existsSync(window.configPath)) {
      console.log("creating empty config file")
      const obj = getDefaultSettings();
      await writeFile(window.configPath, JSON.stringify(obj));
    }
    const data = await readFile(window.configPath);
    JsonObj = JSON.parse(data);
    if (type in JsonObj) { return JsonObj[type]; }
    return '';
  }
  catch (E) {
    console.log(E);
  }
  return '';
}
export async function updateConfig(type, value) {
  try {
    const filename = window.configPath;
    const data = await readFile(filename);
    JsonObj = JSON.parse(data);
    JsonObj[type] = value;
    await writeFile(filename, JSON.stringify(JsonObj));
  }
  catch (E) {
    console.log(E);
  }
  return null;
}
export async function updateProfileConfig(value) {
  await updateConfig("prfldb", value);
}
export async function updateScoreAttackConfig(value) {
  await updateConfig("showScoreAttack", value);
}
export async function updateUseCDLCConfig(value) {
  await updateConfig("useCDLCinStats", value);
}
export async function updateSteamLoginSecureCookie(value) {
  await updateConfig("steamLoginSecure", value);
}
export async function updateSessionIDConfig(value) {
  await updateConfig("sessionID", value);
}
export async function updateSteamIDConfig(value) {
  await updateConfig("steamID", value);
}
export async function updateScoreAttackDashboard(current) {
  await updateConfig("scoreAttackDashboard", current);
}
export async function updateMasteryThreshold(current) {
  await updateConfig("masteryThreshold", current);
}
export async function updatePSStats(current) {
  await updateConfig("showPSStats", current);
}
export async function updateDateFormat(current) {
  await updateConfig("dateFormat", current);
}
export async function updateDateSrc(current) {
  await updateConfig("dateSrc", current);
}
export async function updateSteamAPIKey(current) {
  await updateConfig("steamAPIKey", current);
}
export async function updateDefaultSortOption(current) {
  await updateConfig("defaultSortOption", current);
}
export async function updateShowSetlistOverlayAlways(current) {
  await updateConfig("showSetlistOverlayAlways", current);
}

export default async function getProfileConfig() {
  const d = await getConfig("prfldb");
  return d;
}
export async function getSteamLoginSecureCookie() {
  const d = await getConfig("steamLoginSecure");
  return d;
}
export async function getSessionIDConfig() {
  const d = await getConfig("sessionID");
  return d;
}
export async function getScoreAttackConfig() {
  const d = await getConfig("showScoreAttack");
  if (d === '') return true; //default value
  return d;
}
export async function getUseCDLCConfig() {
  const d = await getConfig("useCDLCinStats");
  if (d === '') return true; //default value
  return d;
}
export async function getMasteryThresholdConfig() {
  const d = await getConfig("masteryThreshold");
  if (d === '') return 0.95; //default value
  return d;
}
export async function getScoreAttackDashboardConfig() {
  const d = await getConfig("scoreAttackDashboard");
  if (d === '') return [true, true, true, true];
  return d;
}
export async function getShowPSStatsConfig() {
  const d = await getConfig("showPSStats");
  if (d === '') return false; //default value
  return d;
}
export async function getDateFormatConfig() {
  const d = await getConfig("dateFormat");
  if (d === '') return "dhm"; //default value
  return d;
}
export async function getDateSrcConfig() {
  const d = await getConfig("dateSrc");
  if (d === '') return "rs"; //default value
  return d;
}
export async function getSteamIDConfig() {
  const d = await getConfig("steamID");
  if (d === '') return ""; //default value
  return d;
}
export async function getSteamAPIKeyConfig() {
  const d = await getConfig("steamAPIKey");
  if (d === '') return ""; //default value
  return d;
}
export async function getDefaultSortOptionConfig() {
  const d = await getConfig("defaultSortOption");
  if (d === '') return defaultSortOption; //default value
  return d;
}
export async function getShowSetlistOverlayAlwaysConfig() {
  const d = await getConfig("showSetlistOverlayAlways");
  if (d === '') return false; //default value
  return d;
}
