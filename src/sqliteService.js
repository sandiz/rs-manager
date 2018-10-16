import { generateSql } from "./Components/setlistOptions";
import { getMasteryThresholdConfig } from "./configService";

let db = null;
export async function getUserVersion() {
  const sql = "pragma user_version;";
  const op = await db.get(sql);
  return op.user_version;
}
export async function setUserVersion(version) {
  const sql = `pragma user_version=${version};`;
  await db.get(sql);
}
export async function initSongsOwnedDB() {
  //console.log("__db_call__: initSongsOwnedDB ");
  if (db === null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  const createTableSql = "CREATE TABLE IF NOT EXISTS songs_owned (album char, artist char, song char, arrangement char, json char, psarc char, dlc char, sku char, difficulty float, dlckey char, songkey char, id char, uniqkey char primary key, mastery float default 0, count int default 0, lastConversionTime real, constraint id_unique unique (id) );";
  await db.run(createTableSql);
  let version = await getUserVersion();

  let altersql = "";
  altersql += "alter table songs_owned add sa_playcount int default 0;"
  altersql += "alter table songs_owned add sa_ts real;"

  altersql += "alter table songs_owned add sa_hs_easy real;"
  altersql += "alter table songs_owned add sa_hs_medium real;"
  altersql += "alter table songs_owned add sa_hs_hard real;"
  altersql += "alter table songs_owned add sa_hs_master real;"

  altersql += "alter table songs_owned add sa_badge_easy int default 0;"
  altersql += "alter table songs_owned add sa_badge_medium int default 0;"
  altersql += "alter table songs_owned add sa_badge_hard int default 0;"
  altersql += "alter table songs_owned add sa_badge_master int default 0;"
  altersql += "alter table songs_owned add sa_highest_badge int default 0;"

  let altersql2 = "";
  altersql2 += "alter table songs_owned add arrangementProperties blob;"
  altersql2 += "alter table songs_owned add capofret float default 0;"
  altersql2 += "alter table songs_owned add centoffset float default 0;"
  altersql2 += "alter table songs_owned add tuning blob;"

  let altersql3 = "";
  altersql3 += "alter table songs_owned add songLength float;"
  altersql3 += "alter table songs_owned add maxNotes int;"
  altersql3 += "alter table songs_owned add tempo int;"

  let altersql4 = "";
  altersql4 += "alter table songs_owned add is_cdlc boolean default false;"
  altersql4 += "alter table songs_owned add sa_fc_easy real default null;"
  altersql4 += "alter table songs_owned add sa_fc_medium real default null;"
  altersql4 += "alter table songs_owned add sa_fc_hard real default null;"
  altersql4 += "alter table songs_owned add sa_fc_master real default null;"


  switch (version) {
    case 0: {
      // add score attack stats
      await db.exec(altersql);
      version += 1
      await setUserVersion(version);
    }
    case 1: {
      // remove duplicates
      let sql = "";
      sql += "DELETE FROM songs_owned WHERE rowid NOT IN (SELECT MIN(rowid) FROM songs_owned GROUP BY id);";
      sql += "PRAGMA foreign_keys=off;";
      sql += "BEGIN TRANSACTION;";
      sql += "ALTER TABLE songs_owned RENAME TO songs_owned_old;";
      sql += createTableSql;
      sql += altersql;
      sql += "INSERT INTO songs_owned SELECT * FROM songs_owned_old;";
      sql += "COMMIT;";
      sql += "PRAGMA foreign_keys=on;";
      sql += "DROP TABLE songs_owned_old;"
      await db.exec(sql);
      version += 1
      await setUserVersion(version);
    }
    case 2:
      // add arrangement info
      await db.exec(altersql2);
      version += 1
      await setUserVersion(version);
    case 3:
      // add songLength/tempo/notes info
      await db.exec(altersql3);
      version += 1
      await setUserVersion(version);
    case 4:
      // add is_cdlc, sa_easy_fc, sa_medium_fc, sa_hard_fc, sa_expert_fc
      await db.exec(altersql4);
      version += 1
      await setUserVersion(version);
    /* next case is 6 */ /* 5 used by setlist_meta */
    default:
      break;
  }
}
export async function initSongsAvailableDB() {
  //console.log("__db_call__: initSongsAvailableDB");
  if (db === null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  await db.run("CREATE TABLE IF NOT EXISTS songs_available (appid char primary key, name char, release_date float, owned boolean default false, acquired_date float default NULL);");
}
export async function initSetlistPlaylistDB(dbname) {
  // console.log("__db_call__: initSetlistPlaylistDB");
  if (db === null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  await db.run(`CREATE TABLE IF NOT EXISTS ${dbname} ( uniqkey char UNIQUE primary key, FOREIGN KEY(uniqkey) REFERENCES songs_owned(uniqkey));`);
}
export async function initSetlistDB() {
  // console.log("__db_call__: initSetlistDB");
  if (db === null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  let version = await getUserVersion();
  await db.run("CREATE TABLE IF NOT EXISTS setlist_meta (key char primary key, name char);");

  let altersql5 = "";
  altersql5 += "alter table setlist_meta add is_manual boolean default null;"
  altersql5 += "alter table setlist_meta add is_generated boolean default null;"
  altersql5 += "alter table setlist_meta add view_sql char default null;"
  let altersql6 = "";
  altersql6 += "alter table setlist_meta add is_rssetlist boolean default null;"
  switch (version) {
    case 5:
      // add is_manual, is_generated, view_sql in setlist_meta
      await db.exec(altersql5);
      version += 1
      await setUserVersion(version);
    case 6:
      await db.exec(altersql6);
      version += 1
      await setUserVersion(version);
      break;
    default:
      break;
  }

  await db.run("REPLACE INTO setlist_meta VALUES('setlist_practice','Practice List', 'true', 'false', '', 'false');")
  await initSetlistPlaylistDB("setlist_practice");
  await db.run("REPLACE INTO setlist_meta VALUES('setlist_favorites','RS Favorites', 'true', 'false', '', 'true');")
  await initSetlistPlaylistDB("setlist_favorites");
}
export async function addToSteamDLCCatalog(dlc, name, releaseDate, dontparseDate = false) {
  // console.log("__db_call__: addToSteamDLCCatalog");
  let sqlstr = ";";
  let date = 0;
  if (!Number.isNaN(releaseDate)) {
    if (!dontparseDate) {
      date = Date.parse(releaseDate);
    }
    else {
      date = releaseDate;
    }
  }
  if (Number.isNaN(date)) { date = 0; }
  const owned = false;
  sqlstr += `REPLACE INTO songs_available (appid, name, release_date, owned) VALUES ('${dlc}',"${name}", ${date}, '${owned}');`
  //});
  //console.log(sqlstr);
  await db.run(sqlstr); // Run the query without returning anything
}
export async function getDLCDetails(start = 0, count = 10, sortField = "release_date", sortOrder = "desc", search = "", owned = "") {
  // console.log("__db_call__: getDLCDetails");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  let sql;
  let ownedstring = "";
  if (owned !== "") {
    ownedstring = `where owned='${owned}'`
  }
  let allownedstring = "";
  if (owned !== "") {
    allownedstring = `and owned='${owned}'`
  }
  if (search === "") {
    sql = `select c.acount as acount,d.nopackcount as nopackcount, appid, name, acquired_date, release_date, owned
           from songs_available,  (
           SELECT count(*) as acount
            FROM songs_available
            ${ownedstring}
          ) c , (
           SELECT count(*) as nopackcount
            FROM songs_available
            where name NOT like '%${"Song Pack"}%' ${allownedstring}
          ) d
          ${ownedstring}
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}`;
  }
  else {
    sql = `select c.acount as acount, d.nopackcount as nopackcount, appid, name, acquired_date, release_date, owned from songs_available, (
          SELECT count(*) as acount 
            FROM songs_available
            where (name like '%${search}%' or appid like '%${search}%')
            ${allownedstring}
          ) c , (
           SELECT count(*) as nopackcount
            FROM songs_available
            where (name NOT like '%${"Song Pack"}%' AND name like '%${search}%' or appid like '%${search}%') ${allownedstring}
          ) d
          where (name like '%${search}%' or appid like '%${search}%') ${allownedstring}
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}`;
  }
  const output = await db.all(sql);
  return output
}
export async function isDLCInDB(dlc) {
  //  console.log("__db_call__: isDLCInDB");
  let sqlstr = "";
  sqlstr += `SELECT count(appid) as count from songs_available where appid LIKE '%${dlc}%'`
  //});
  //console.log(sqlstr);
  const res = await db.get(sqlstr); // Run the query without returning anything
  if (res.count === 0) {
    return false;
  }
  return true;
}
export async function updateOwnedInDB(dlc) {
  //.console.log("__db_call__: updateOwnedInDB");
  let sqlstr = "";
  sqlstr += `UPDATE songs_available SET owned='true' where appid LIKE ${dlc}`;
  await db.run(sqlstr);
}
export async function countSongsAvailable() {
  // console.log("__db_call__: countSongsAvailable");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select count(*) as count from songs_available`;
  const output = await db.get(sql);
  return output
}
export async function saveSongsOwnedDB() {
  //console.log("__db_call__: saveSongsOwnedDB");
  //await db.close();
}
export async function updateMasteryandPlayed(id, mastery, playedcount) {
  // console.log("__db_call__: updateMasteryandPlayed");
  //await db.close();
  const op = await db.run("UPDATE songs_owned SET mastery=?,count=? where id=?", mastery, playedcount, id);
  return op.changes;
}
export async function updateScoreAttackStats(stat, badgeHighest, id) {
  const op = await db.run(
    "UPDATE songs_owned SET sa_playcount=?, sa_ts=?, sa_hs_easy=?, sa_hs_medium=?, sa_hs_hard=?, sa_hs_master=?, sa_badge_easy=?, sa_badge_medium=?, sa_badge_hard=?, sa_badge_master=?, sa_highest_badge= ? where id=?",
    stat.PlayCount, stat.TimeStamp,
    stat.HighScores.Easy, stat.HighScores.Medium, stat.HighScores.Hard, stat.HighScores.Master,
    stat.Badges.Easy, stat.Badges.Medium, stat.Badges.Hard, stat.Badges.Master,
    badgeHighest,
    id,
  );
  return op.changes;
}
export async function updateAcquiredDate(date, item) {
  // console.log("__db_call__: updateMasteryandPlayed");
  //await db.close();
  const sql = `UPDATE songs_available SET acquired_date='${date}' where name LIKE "%${item}"`
  const op = await db.run(sql);
  return op.changes;
}
export async function updateAcquiredDateByAppID(appid, date) {
  // console.log("__db_call__: updateMasteryandPlayed");
  //await db.close();
  const sql = `UPDATE songs_available SET acquired_date='${date}' where appid LIKE '${appid}'`
  const op = await db.run(sql);
  return op.changes;
}
export async function getAppID(item) {
  const sql = `select appid,release_date from songs_available where name LIKE '%${item}'`;
  const output = await db.get(sql);
  return output
}
export async function countAppID(item, rd) {
  const sql = `select count(appid) as count,name from songs_available where release_date=${rd} AND appid LIKE '${item}'`;
  const output = await db.get(sql);
  return output
}
export async function removeFromSongsOwned(songid) {
  const sql = `delete from songs_owned where id = '${songid}'`;
  await db.run(sql);
}
export default async function updateSongsOwned(psarcResult, isCDLC = false) {
  // console.log("__db_call__: updateSongsOwned");
  let sqlstr = "";
  //psarcResults.forEach((psarcResult) => {
  const album = escape(psarcResult.album);
  const artist = escape(psarcResult.artist);
  const song = escape(psarcResult.song);
  const arrangement = escape(psarcResult.arrangement);
  const json = escape(psarcResult.json);
  const psarc = escape(psarcResult.psarc);
  const dlc = escape(psarcResult.dlc);
  const sku = escape(psarcResult.sku);
  const difficulty = escape(psarcResult.difficulty);
  const dlckey = escape(psarcResult.dlckey);
  const songkey = escape(psarcResult.songkey);
  const id = escape(psarcResult.id);
  const uniqkey = escape(psarcResult.uniquekey);
  const lct = escape(psarcResult.lastConversionTime);
  const ap = escape(psarcResult.arrangementProperties);
  const capo = psarcResult.capofret;
  const cent = psarcResult.centoffset;
  const tuning = escape(psarcResult.tuning);
  const notes = psarcResult.maxNotes;
  const tmpo = psarcResult.tempo;
  const length = psarcResult.songLength;
  let mastery = 0
  let count = 0
  let cdlc = isCDLC;
  sqlstr = `select mastery, count, is_cdlc from songs_owned where song='${song}' AND
  album='${album}' AND artist='${artist}' AND arrangement='${arrangement}'`;
  const op = await db.all(sqlstr);
  if (op.length > 0) {
    mastery = op[0].mastery === null ? 0 : op[0].mastery;
    count = op[0].count === null ? 0 : op[0].count;
    cdlc = op[0].is_cdlc === "true" ? true : isCDLC;
  }

  sqlstr = `INSERT OR IGNORE INTO songs_owned (album, artist, song, arrangement, json, psarc, dlc, sku, difficulty, dlckey, songkey,\
  id,uniqkey, lastConversionTime, mastery, \
  count, arrangementProperties, capofret, centoffset, tuning,\
  songLength, maxNotes, tempo, is_cdlc)\
  VALUES ('${album}','${artist}',
      '${song}','${arrangement}','${json}','${psarc}',
      '${dlc}','${sku}',${difficulty},'${dlckey}',
      '${songkey}','${id}', '${uniqkey}', '${lct}', '${mastery}','${count}', '${ap}', '${capo}','${cent}','${tuning}', '${length}', '${notes}', '${tmpo}', '${cdlc}')\
      ;`
  const sqlstr2 = `update songs_owned set is_cdlc='${cdlc}' where id like '${id}';`;
  console.log(sqlstr2)
  //});
  try {
    await db.run(sqlstr); // Run the query without returning anything
    await db.run(sqlstr2);
  }
  catch (error) {
    console.log(error);
    console.log(sqlstr);
    console.log(psarcResult);
  }
}
export async function getSongsOwned(start = 0, count = 10, sortField = "mastery", sortOrder = "desc", search = "", searchField = "") {
  //  console.log("__db_call__: getSongsOwned");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  let sql;
  let searchSql = `( song like '%${escape(search)}%' or 
            artist like '%${escape(search)}%' or 
            album like '%${escape(search)}%' )`
  switch (searchField) {
    case "song":
      searchSql = `song like '%${escape(search)}%'`
      break;
    case "album":
      searchSql = `album like '%${escape(search)}%'`
      break;
    case "artist":
      searchSql = `artist like '%${escape(search)}%'`
      break;
    case "cdlc":
      searchSql += ` and is_cdlc = 'true'`
      break;
    case "odlc":
      searchSql += ` and is_cdlc = 'false'`
      break;
    default: break;
  }
  if (search === "" && searchField !== "cdlc" && searchField !== "odlc") {
    sql = `select c.acount as acount, c.songcount as songcount, *
          from songs_owned,  (
          SELECT count(*) as acount, count(distinct songkey) as songcount
            FROM songs_owned
          ) c 
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}`;
  }
  else {
    sql = `select c.acount as acount, c.songcount as songcount, *
          from songs_owned, (
          SELECT count(*) as acount, count(distinct songkey) as songcount
            FROM songs_owned
            where 
            ${searchSql}
          ) c 
          where
          ${searchSql}
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}`;
  }
  const output = await db.all(sql);
  return output
}
export async function countSongsOwned(useCDLC = false) {
  // console.log("__db_call__: countSongsOwned");
  const cdlcSql = useCDLC ? "" : "where is_cdlc = 'false'";
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select count(*) as count, count(distinct songkey) as songcount from songs_owned ${cdlcSql};`;
  // console.log(sql);
  const output = await db.get(sql);
  return output
}
export async function getSongBySongKey(key, start = 0, count = 10, sortField = "mastery", sortOrder = "desc") {
  // console.log("__db_call__: getSongByID");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select c.acount as acount, c.songcount as songcount, *
          from songs_owned, (
          SELECT count(*) as acount, count(distinct songkey) as songcount
            FROM songs_owned
            where 
            songkey='${key}'
          ) c 
          where songkey='${key}'
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}
          `;
  const output = await db.all(sql);
  if (typeof output === 'undefined') { return '' }
  return output;
}
export async function getSongByID(ID) {
  // console.log("__db_call__: getSongByID");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select distinct song, artist, * from songs_owned where id='${ID}'`;
  const output = await db.get(sql);
  if (typeof output === 'undefined') { return '' }
  return output;
}
export async function getArrangmentsMastered(useCDLC = false) {
  //console.log("__db_call__: getArrangmentsMastered");
  const cdlcSql = useCDLC ? "" : " AND is_cdlc = 'false'";
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  const masteryT = await getMasteryThresholdConfig();
  const sql = `select count(mastery) as count from songs_owned where mastery >= '${masteryT}' ${cdlcSql};`;
  const output = await db.get(sql);
  return output;
}
export async function resetDB(table = 'songs_owned') {
  const sql = `delete from ${table};`
  await db.exec(sql);
}
export async function getSAStats(type = "sa_badge_hard", fctype = "sa_fc_hard", useCDLC = false) {
  const cdlcSql = useCDLC ? "" : "is_cdlc = 'false' AND";
  // console.log("__db_call__: getLeadStats");
  let badgeRating = 0;
  if (type === "sa_badge_master") badgeRating = 40;
  else if (type === "sa_badge_hard") badgeRating = 30;
  else if (type === "sa_badge_medium") badgeRating = 20;
  else if (type === "sa_badge_easy") badgeRating = 10;

  const sqlstr = `select sa.count as satotal, \
  saplat.count as saplat, sagold.count as sagold, sasilver.count as sasilver,\
  sabronze.count as sabronze, safailed.count as safailed, safcs.count as safcs from \
  (select count(*) as count from songs_owned where ${cdlcSql} ${fctype} is not null) safcs, \
  (select count(*) as count from songs_owned where ${cdlcSql} sa_playcount > 0 AND ${type} > ${badgeRating}) sa, \
  (select count(*) as count from songs_owned where ${cdlcSql} sa_playcount > 0 AND (${type} == ${badgeRating + 1})) safailed,
  (select count(*) as count from songs_owned where ${cdlcSql} sa_playcount > 0 AND (${type} == ${badgeRating + 2})) sabronze, \
  (select count(*) as count from songs_owned where ${cdlcSql} sa_playcount > 0 AND (${type} == ${badgeRating + 3})) sasilver, \
  (select count(*) as count from songs_owned where ${cdlcSql} sa_playcount > 0 AND (${type} == ${badgeRating + 4})) sagold, \
  (select count(*) as count from songs_owned where ${cdlcSql} ${fctype} is null AND sa_playcount > 0 AND (${type} == ${badgeRating + 5})) saplat;`
  const output = await db.get(sqlstr);
  return output;
}
export async function getLeadStats(useCDLC = false) {
  const cdlcSql = useCDLC ? "" : "is_cdlc = 'false' AND";
  // console.log("__db_call__: getLeadStats");
  //eslint-disable-next-line
  const sqlstr = `select l.count as l,\
  l1.count as l1, \
  l2.count as l2, \
  l3.count as l3, \
  l4.count as l4, \
  l5.count as l5, \
  l6.count as l6, \
  up.count as lup from \
  (select count(*) as count from songs_owned where ${cdlcSql} arrangement like '%lead%')l, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= 1 AND arrangement like '%lead%') l1, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .95 AND mastery < 1 AND arrangement like '%lead%') l2, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .90 AND mastery < .95 AND arrangement like '%lead%') l3, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .80 AND mastery < .90 AND arrangement like '%lead%') l4, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .70 AND mastery < .80 AND arrangement like '%lead%') l5, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .1 AND mastery < .70 AND arrangement like '%lead%') l6, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery < .1 AND arrangement like '%lead%') up;`
  const output = await db.get(sqlstr);
  return output;
}
export async function getRhythmStats(useCDLC = false) {
  const cdlcSql = useCDLC ? "" : "is_cdlc = 'false' AND";
  //console.log("__db_call__: getRhythmStats");
  //eslint-disable-next-line
  const sqlstr = `select l.count as r,\
  l1.count as r1, \
  l2.count as r2, \
  l3.count as r3, \
  l4.count as r4, \
  l5.count as r5, \
  l6.count as r6, \
  up.count as rup from \
  (select count(*) as count from songs_owned where ${cdlcSql} arrangement like '%rhythm%')l, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= 1 AND arrangement like '%rhythm%') l1, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .95 AND mastery < 1 AND arrangement like '%rhythm%') l2, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .90 AND mastery < .95 AND arrangement like '%rhythm%') l3, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .80 AND mastery < .90 AND arrangement like '%rhythm%') l4, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .70 AND mastery < .80 AND arrangement like '%rhythm%') l5, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .1 AND mastery < .70 AND arrangement like '%rhythm%') l6, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery < .1 AND arrangement like '%rhythm%') up;`
  const output = await db.get(sqlstr);
  return output;
}
export async function getBassStats(useCDLC = false) {
  const cdlcSql = useCDLC ? "" : "is_cdlc = 'false' AND";
  // console.log("__db_call__: getBassStats");
  //eslint-disable-next-line
  const sqlstr = `select l.count as b,\
  l1.count as b1, \
  l2.count as b2, \
  l3.count as b3, \
  l4.count as b4, \
  l5.count as b5, \
  l6.count as b6, \
  up.count as bup from \
  (select count(*) as count from songs_owned where ${cdlcSql} arrangement like '%bass%')l, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= 1 AND arrangement like '%bass%') l1, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .95 AND mastery < 1 AND arrangement like '%bass%') l2, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .90 AND mastery < .95 AND arrangement like '%bass%') l3, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .80 AND mastery < .90 AND arrangement like '%bass%') l4, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .70 AND mastery < .80 AND arrangement like '%bass%') l5, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery >= .1 AND mastery < .70 AND arrangement like '%bass%') l6, \
  (select count(*) as count from songs_owned where ${cdlcSql} mastery < .1 AND arrangement like '%bass%') up;`
  const output = await db.get(sqlstr);
  return output;
}
export async function getSetlistMetaInfo(key) {
  const sql = `select * from setlist_meta where key='${key}'`;
  const op = await db.get(sql);
  return op;
}
export async function getAllSetlist(filter = false) {
  // console.log("__db_call__: getAllSetlist");
  await initSetlistDB();
  let sql = ''
  if (filter) {
    sql = "SELECT * FROM setlist_meta where key not like '%setlist_favorites%' and key not like '%rs_song_list%' and is_manual='true' order by rowid asc;"
  }
  else {
    sql = "SELECT * FROM setlist_meta  order by rowid asc;"
  }
  const all = await db.all(sql);
  return all;
}
export async function isTablePresent(tablename) {
  const sql = `SELECT count(*) as count FROM sqlite_master WHERE type='table' and name='${tablename}'`;
  const op = await db.get(sql);
  if (op.count === 0) {
    return false;
  }
  return true;
}
export async function createRSSongList(
  tablename, displayname,
  isgenerated = null, ismanual = null, viewsql = null, isrscustom = null,
) {
  await initSetlistPlaylistDB(tablename);
  await db.run(`
    REPLACE INTO setlist_meta VALUES(
    '${tablename}',
    '${escape(displayname)}', 
    '${ismanual}', 
    '${isgenerated}',
    '${viewsql}',
    '${isrscustom}'
    );`)
}
export async function addtoRSSongList(tablename, songkey) {
  const sql = `replace into '${tablename}' (uniqkey) select uniqkey from songs_owned where songkey like '%${songkey}%'`
  const op = await db.run(sql)
  return op.changes;
}
export async function deleteRSSongList(tablename) {
  const sql = `DELETE from setlist_meta where key='${tablename}'; DROP TABLE '${tablename}';`;
  await db.exec(sql)
}
export async function getSongCountFromPlaylistDB(dbname) {
  //console.log("__db_call__: getSongCountFromPlaylistDB");
  const sql = `SELECT count(*) as songcount, count(distinct songkey) as count FROM ${dbname} order by uniqkey collate nocase;`
  const all = await db.get(sql);
  return all;
}
export async function getSongsFromGeneratedPlaylist(
  meta,
  start = 0, count = 10,
  sortField = "mastery", sortOrder = "desc",
) {
  if (meta.view_sql.length > 0) {
    try {
      const jsonObj = JSON.parse(meta.view_sql)
      let sql = generateSql(jsonObj);
      const countsql = generateSql(jsonObj, true)
      sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count};`
      const output = await db.all(sql);
      const output2 = await db.get(countsql)
      return [output, output2];
    }
    catch (e) {
      return [];
    }
  }
  return [];
}
export async function getSongsFromPlaylistDB(dbname, start = 0, count = 10, sortField = "mastery", sortOrder = "desc", search = "", searchField = "") {
  // console.log("__db_call__: getSongsFromPlaylistDB");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  let sql;
  let searchSql = `song like '%${escape(search)}%' or 
            artist like '%${escape(search)}%' or 
            album like '%${escape(search)}%'`
  switch (searchField) {
    case "song":
      searchSql = `song like '%${escape(search)}%'`
      break;
    case "album":
      searchSql = `album like '%${escape(search)}%'`
      break;
    case "artist":
      searchSql = `artist like '%${escape(search)}%'`
      break;
    default: break;
  }
  if (search === "") {
    sql = `select c.acount as acount, c.songcount as songcount, *
          from songs_owned,  (
          SELECT count(*) as acount, count(distinct songkey) as songcount
            FROM songs_owned
            JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
          ) c 
          JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}
          `;
  }
  else {
    sql = `select c.acount as acount, c.songcount as songcount, *
          from songs_owned, (
          SELECT count(*) as acount, count(distinct songkey) as songcount
            FROM songs_owned
            JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
            where 
            ${searchSql}
          ) c 
          JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
          where
          ${searchSql}
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}
          `;
  }
  const output = await db.all(sql);
  return output
}
export async function removeSongFromSetlist(dbname, song, artist, album) {
  // console.log("__db_call__: removeSongFromSetlist");
  let sql = `select uniqkey from songs_owned where song like '%${song}%' and artist like '%${artist}%' and album like '%${album}%'`;
  const op = await db.all(sql)
  sql = "";
  for (let i = 0; i < op.length; i += 1) {
    const uniq = op[i].uniqkey;
    sql = `DELETE FROM '${dbname}' where uniqkey='${uniq}';`
    /* loop await */ //eslint-disable-next-line
    await db.all(sql);
  }
}
export async function saveSongToSetlist(setlist, song, artist) {
  // console.log("__db_call__: saveSongToSetlist");
  let sql = `select uniqkey from songs_owned where song like '%${escape(song)}%' and artist like '%${escape(artist)}%'`
  const op = await db.all(sql);
  for (let i = 0; i < op.length; i += 1) {
    const uniq = op[i].uniqkey;
    sql = `replace into '${setlist}' values ('${uniq}')`;
    /* loop await */ //eslint-disable-next-line
    await db.run(sql)
  }
}
export async function addToFavorites(songkey) {
  // console.log("__db_call__: addToFavorites");
  const sql = `replace into setlist_favorites (uniqkey) select uniqkey from songs_owned where songkey like '%${songkey}%'`
  const op = await db.run(sql)
  return op.changes;
}

export async function getRandomSongOwned() {
  //console.log("__db_call__: getRandomSongOwned");
  await initSongsOwnedDB();
  const masteryT = await getMasteryThresholdConfig();
  const sql = `select * from songs_owned where mastery < '${masteryT}' order by random() limit 1;`
  const op = await db.get(sql);
  return op;
}
export async function getRandomSongAvailable() {
  //console.log("__db_call__: getRandomSongAvailable");
  await initSongsAvailableDB();
  const sql = "select * from songs_available where name not like '%Song%20Pack%' and owned='false' order by random() limit 1;"
  const op = await db.get(sql);
  return op;
}
export async function updateCDLCStat(songID, status) {
  const sql = `update songs_owned set is_cdlc='${status}' where id='${songID}'`;
  await db.exec(sql);
}
export async function updateSAFCStat(key, value, songID) {
  const sql = `update songs_owned set ${key}='${value}' where id='${songID}'`;
  await db.exec(sql);
}
export async function executeRawSql(sql) {
  const op = await db.get(sql);
  console.log(op)
  return op;
}
window.remote.app.on('window-all-closed', async () => {
  await saveSongsOwnedDB();
  console.log("Saved to db..");
})
