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
  const version = await getUserVersion();

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

  if (version === 0) {
    await db.exec(altersql);
    await setUserVersion(version + 1);
  }
  else if (version === 1) {
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
    await setUserVersion(version + 1);
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
export async function addToSteamDLCCatalog(dlc, name, releaseDate) {
  // console.log("__db_call__: addToSteamDLCCatalog");
  let sqlstr = ";";
  let date = Date.parse(releaseDate);
  //eslint-disable-next-line
  if (isNaN(date)) { date = 0; }
  const owned = false;
  sqlstr += `REPLACE INTO songs_available (appid, name, release_date, owned) VALUES ('${dlc}',"${name}", ${date}, '${owned}');`
  //});
  console.log(sqlstr);
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
  console.log(songid);
  const sql = `delete from songs_owned where id = '${songid}'`;
  await db.run(sql);
}
export default async function updateSongsOwned(psarcResult) {
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
  let mastery = 0
  let count = 0
  sqlstr = `select mastery, count from songs_owned where song='${song}' AND
  album='${album}' AND artist='${artist}' AND arrangement='${arrangement}'`;
  const op = await db.all(sqlstr);
  if (op.length > 0) {
    //eslint-disable-next-line
    mastery = op[0].mastery === null ? 0 : op[0].mastery;
    count = op[0].count === null ? 0 : op[0].count;
  }

  sqlstr = `REPLACE INTO songs_owned (album, artist, song, arrangement, json, psarc, dlc, sku, difficulty, dlckey, songkey, id,uniqkey, lastConversionTime, mastery, count) VALUES ('${album}','${artist}',
      '${song}','${arrangement}','${json}','${psarc}',
      '${dlc}','${sku}',${difficulty},'${dlckey}',
      '${songkey}','${id}', '${uniqkey}', '${lct}', '${mastery}','${count}');`
  //});
  try {
    await db.run(sqlstr); // Run the query without returning anything
  }
  catch (error) {
    console.log(error);
  }
}
export async function getSongsOwned(start = 0, count = 10, sortField = "mastery", sortOrder = "desc", search = "") {
  //  console.log("__db_call__: getSongsOwned");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  let sql;
  if (search === "") {
    sql = `select c.acount as acount, c.songcount as songcount, song, album, artist, arrangement, mastery,
          count, difficulty, uniqkey, id, lastConversionTime, json,
          sa_playcount, sa_ts, 
          sa_hs_easy, sa_hs_medium, sa_hs_hard, sa_hs_master, 
          sa_badge_easy, sa_badge_medium,sa_badge_hard, sa_badge_master, sa_highest_badge
          from songs_owned,  (
          SELECT count(*) as acount, count(distinct song) as songcount
            FROM songs_owned
          ) c 
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}`;
  }
  else {
    sql = `select c.acount as acount, c.songcount as songcount, song, album, artist, arrangement, mastery,
          count, difficulty, uniqkey, id, lastConversionTime, json, 
          sa_playcount, sa_ts, 
          sa_hs_easy, sa_hs_medium, sa_hs_hard, sa_hs_master, 
          sa_badge_easy, sa_badge_medium,sa_badge_hard, sa_badge_master, sa_highest_badge
          from songs_owned, (
          SELECT count(*) as acount, count(distinct song) as songcount
            FROM songs_owned
            where song like '%${escape(search)}%' or artist like '%${escape(search)}%' or album like '%${escape(search)}%'
          ) c 
          where song like '%${escape(search)}%' or artist like '%${escape(search)}%' or album like '%${escape(search)}%'
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}`;
  }
  //console.log(sql);
  const output = await db.all(sql);
  return output
}
export async function countSongsOwned() {
  // console.log("__db_call__: countSongsOwned");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    console.log(dbfilename);
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select count(*) as count, count(distinct song) as songcount from songs_owned`;
  // console.log(sql);
  const output = await db.get(sql);
  return output
}
export async function getSongID(ID) {
  // console.log("__db_call__: getSongID");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    console.log(dbfilename);
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select distinct song, artist from songs_owned where id='${ID}'`;
  const output = await db.get(sql);
  if (typeof output === 'undefined') { return '' }
  return output;
}
export async function getArrangmentsMastered() {
  //console.log("__db_call__: getArrangmentsMastered");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    console.log(dbfilename);
    db = await window.sqlite.open(dbfilename);
  }
  const sql = `select count(mastery) as count from songs_owned where mastery > 0.95`;
  const output = await db.get(sql);
  return output;
}
export async function resetDB(table = 'songs_owned') {
  const sql = `delete from ${table};`
  await db.exec(sql);
}
export async function getSAStats(type = "sa_badge_hard") {
  // console.log("__db_call__: getLeadStats");
  const badgeHard = (type === "sa_badge_hard");
  const sqlstr = `select sa.count as satotal, saplat.count as saplat, sagold.count as sagold, sasilver.count as sasilver,sabronze.count as sabronze, safailed.count as safailed from \
  (select count(*) as count from songs_owned where sa_playcount > 0 AND ${type} > ${badgeHard ? 30 : 40}) sa, \
  (select count(*) as count from songs_owned where sa_playcount > 0 AND (${type} == ${badgeHard ? 35 : 45})) saplat, \
  (select count(*) as count from songs_owned where sa_playcount > 0 AND (${type} == ${badgeHard ? 34 : 44})) sagold, \
  (select count(*) as count from songs_owned where sa_playcount > 0 AND (${type} == ${badgeHard ? 33 : 43})) sasilver, \
  (select count(*) as count from songs_owned where sa_playcount > 0 AND (${type} == ${badgeHard ? 32 : 42})) sabronze, \
  (select count(*) as count from songs_owned where sa_playcount > 0 AND (${type} == ${badgeHard ? 31 : 41})) safailed; `
  const output = await db.get(sqlstr);
  return output;
}
export async function getLeadStats() {
  // console.log("__db_call__: getLeadStats");
  const sqlstr = "select l.count as l,lh.count as lh,lm.count as lm,ll.count as ll,up.count as lup from (select count(*) as count from songs_owned where arrangement like '%lead%')l, (select count(*) as count from songs_owned where mastery > .95 AND arrangement like '%lead%') lh, (select count(*) as count from songs_owned where mastery > .90 AND mastery <= .95 AND arrangement like '%lead%') lm, (select count(*) as count from songs_owned where mastery >= .1 AND mastery <= .90 AND arrangement like '%lead%') ll, (select count(*) as count from songs_owned where mastery < .1 AND arrangement like '%lead%') up;"
  const output = await db.get(sqlstr);
  return output;
}
export async function getRhythmStats() {
  //console.log("__db_call__: getRhythmStats");
  const sqlstr = "select l.count as r,lh.count as rh,lm.count as rm,ll.count as rl,up.count as rup from (select count(*) as count from songs_owned where arrangement like '%rhythm%')l, (select count(*) as count from songs_owned where mastery > .95 AND arrangement like '%rhythm%') lh, (select count(*) as count from songs_owned where mastery > .90 AND mastery <= .95 AND arrangement like '%rhythm%') lm, (select count(*) as count from songs_owned where mastery >= .1 AND mastery <= .90 AND arrangement like '%rhythm%') ll, (select count(*) as count from songs_owned where mastery < .1 AND arrangement like '%rhythm%') up;"
  const output = await db.get(sqlstr);
  return output;
}
export async function getBassStats() {
  // console.log("__db_call__: getBassStats");
  const sqlstr = "select l.count as b,lh.count as bh,lm.count as bm,ll.count as bl,up.count as bup from (select count(*) as count from songs_owned where arrangement like '%bass%')l, (select count(*) as count from songs_owned where mastery > .95 AND arrangement like '%bass%') lh, (select count(*) as count from songs_owned where mastery > .90 AND mastery <= .95 AND arrangement like '%bass%') lm, (select count(*) as count from songs_owned where mastery >= .1 AND mastery <= .90 AND arrangement like '%bass%') ll, (select count(*) as count from songs_owned where mastery < .1 AND arrangement like '%bass%') up;"
  const output = await db.get(sqlstr);
  return output;
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
  await db.run("CREATE TABLE IF NOT EXISTS setlist_meta (key char primary key, name char);");
  await db.run("REPLACE INTO setlist_meta VALUES('setlist_practice','Practice List');")
  await initSetlistPlaylistDB("setlist_practice");
  await db.run("REPLACE INTO setlist_meta VALUES('setlist_favorites','RS Favorites');")
  await initSetlistPlaylistDB("setlist_favorites");
}
export async function getAllSetlist(filter = false) {
  // console.log("__db_call__: getAllSetlist");
  await initSetlistDB();
  let sql = ''
  if (filter) {
    sql = "SELECT * FROM setlist_meta where key not like '%setlist_favorites%' order by name collate nocase";
  }
  else {
    sql = "SELECT * FROM setlist_meta  order by name collate nocase;"
  }
  const all = await db.all(sql);
  return all;
}
export async function getSongCountFromPlaylistDB(dbname) {
  //console.log("__db_call__: getSongCountFromPlaylistDB");
  const sql = `SELECT count(*) as songcount, count(distinct song) as count FROM ${dbname} order by uniqkey collate nocase;`
  const all = await db.get(sql);
  return all;
}
export async function getSongsFromPlaylistDB(dbname, start = 0, count = 10, sortField = "mastery", sortOrder = "desc", search = "") {
  // console.log("__db_call__: getSongsFromPlaylistDB");
  if (db == null) {
    const dbfilename = window.sqlitePath;
    db = await window.sqlite.open(dbfilename);
  }
  let sql;
  if (search === "") {
    sql = `select c.acount as acount, c.songcount as songcount, song, artist, album, arrangement, mastery,
          count, difficulty, id, lastConversionTime, json from songs_owned,  (
          SELECT count(*) as acount, count(distinct song) as songcount
            FROM songs_owned
            JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
          ) c 
          JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}
          `;
  }
  else {
    sql = `select c.acount as acount, c.songcount as songcount, song, artist, album, arrangement, mastery,
          count, difficulty, id, lastConversionTime, json from songs_owned, (
          SELECT count(*) as acount, count(distinct song) as songcount
            FROM songs_owned
            JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
            where song like '%${escape(search)}%' or artist like '%${escape(search)}%' or album like '%${escape(search)}%'
          ) c 
          JOIN ${dbname} ON ${dbname}.uniqkey = songs_owned.uniqkey
          where song like '%${escape(search)}%' or artist like '%${escape(search)}%' or album like '%${escape(search)}%'
          ORDER BY ${sortField} ${sortOrder} LIMIT ${start},${count}
          `;
  }
  //console.log(sql);
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
    //eslint-disable-next-line
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
    //eslint-disable-next-line
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
  const sql = "select * from songs_owned order by random() limit 1;"
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
window.remote.app.on('window-all-closed', async () => {
  await saveSongsOwnedDB();
  console.log("Saved to db..");
})
