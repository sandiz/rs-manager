import { toast } from 'react-toastify';
import moment from 'moment';
import React from 'react';
import { DispatcherService, DispatchEvents } from './libdispatcher';
import {
    initSongsOwnedDB, updateRecentlyPlayedSongsV2,
    updateMasteryandPlayedV2, updateScoreAttackStatsV2,
    saveHistoryV2, addToFavoritesV2, initSetlistPlaylistDB,
    createRSSongList, resetRSSongList, createSetlistFromDLCPack,
    addToSteamDLCCatalogV2, updateSongsOwnedV2, removeIgnoredArrangements, updateCDLCStatV2,
} from '../sqliteService';
import { toasterError } from '../App';
import getProfileConfig, { updateProfileConfig } from '../configService'
import readProfile from '../steamprofileService';
import readPSARC from '../psarcService';

const { remote } = window.require('electron');
const parse = require("csv-parse/lib/sync");
const albumArt = require('./../lib/album-art');

const fs = remote.require('fs').promises;
const path = remote.require('path');

class psarcWorker {
    static psarcToaster = (toastID = null, progress = 0, info = {}) => {
        const successmsg = (success) => (success ? "toast-msg-success" : "toast-msg-failure");
        const successicon = (success) => (success ? "fa-check-circle" : "fa-times-circle");
        const iconclass = (pr, success) => (<i className={"fas " + (progress >= pr ? successicon(success) : "fa-circle-notch fa-spin")} />);

        const spanclass = (pr, name, success) => (
            <span className={(progress >= pr ? successmsg(success) : "") + " toast-msg"}>
                {name}
            </span>
        )
        const total = 2;
        const d = (
            <div>
                {
                    progress === total
                        ? <span className="toast-msg toast-msg-success"> PSARC import complete </span>
                        : <span className="toast-msg toast-msg-success"> Importing PSARCs... </span>
                }
                <hr style={{ marginBottom: 7 + 'px' }} />
                <div>
                    {iconclass(1, !(info.files === -1))}
                    {spanclass(1, "Files found", !(info.files === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.files}</span>
                </div>
                <div>
                    {iconclass(2, !(info.imports === -1))}
                    {spanclass(2, "PSARCs imported", !(info.imports === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.imports}</span>
                </div>
            </div>
        )
        if (toastID == null) {
            return toast(d, {
                progress,
                autoClose: false,
                className: "toast-bg",
            });
        }
        else {
            if (progress === total) {
                return toast.update(toastID, {
                    render: d,
                    progress: 0.95,
                });
            }
            else {
                return toast.update(toastID, {
                    render: d,
                    progress: progress / total,
                    autoClose: false,
                });
            }
        }
    }

    static importFiles = async () => {
        let files = await remote.dialog.showOpenDialog({
            properties: ["openFile", "multiSelections"],
            filters: [
                { name: 'PSARC', extensions: ['psarc'] },
            ],
        });
        if (files === null || typeof files === 'undefined' || files.filePaths.length <= 0 || files.canceled) {
            DispatcherService.dispatch(DispatchEvents.PSARCS_IMPORTED, []);
            return;
        }
        files = files.filePaths;
        const info = { files: 0, imports: 0 };
        let progress = 0;
        const toastID = this.psarcToaster(null, 0, info);

        console.log("psarcs selected: " + files.length);
        progress += 1;
        info.files = files.length;
        this.psarcToaster(toastID, progress, info);

        const promises = [];
        for (let i = 0; i < files.length; i += 1) {
            promises.push(readPSARC(files[i]));
        }
        const start = window.performance.now();
        const ret = await Promise.all(promises);
        const end = window.performance.now();

        progress += 1;
        info.imports = ret.length;
        this.psarcToaster(toastID, progress, info);

        console.log('time taken', end - start, "avg", (end - start) / files.length);
        DispatcherService.dispatch(DispatchEvents.PSARCS_IMPORTED, ret.flat());

        setTimeout(() => toast.done(toastID), 2000);
    }

    static walk = async (dir, filelist = []) => {
        const files = await fs.readdir(dir);

        for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            const filepath = path.join(dir, file);
            //eslint-disable-next-line
            const stat = await fs.stat(filepath);

            if (stat.isDirectory()) {
                //eslint-disable-next-line
                filelist = await this.walk(filepath, filelist);
            } else {
                if (filepath.toLowerCase().includes("/tmp/")) { continue; }
                else if (window.os.platform() === 'darwin' && file.endsWith("_m.psarc")) {
                    filelist.push(filepath);
                }
                else if (window.os.platform() === 'win32' && file.endsWith("_p.psarc")) {
                    filelist.push(filepath);
                }
                else if (file.endsWith("songs.psarc")) {
                    filelist.push(filepath);
                }
            }
        }
        return filelist;
    }

    static importDirectory = async () => {
        let dirs = await remote.dialog.showOpenDialog({
            properties: ["openDirectory"],
        });
        if (dirs === null || typeof dirs === 'undefined' || dirs.filePaths.length <= 0 || dirs.canceled) {
            DispatcherService.dispatch(DispatchEvents.PSARCS_IMPORTED, []);
            return;
        }
        dirs = dirs.filePaths;
        const info = { files: 0, imports: 0 };
        let progress = 0;
        const toastID = this.psarcToaster(null, 0, info);

        const results = await this.walk(dirs[0]);
        console.log("psarcs found: " + results.length);

        progress += 1;
        info.files = results.length;
        this.psarcToaster(toastID, progress, info);

        if (results.length > 0) {
            const promises = []
            for (let i = 0; i < results.length; i += 1) {
                promises.push(readPSARC(results[i]));
            }
            const start = window.performance.now();
            const ret = await Promise.all(promises);
            const end = window.performance.now();
            console.log('time taken', end - start, "avg", (end - start) / results.length);
            DispatcherService.dispatch(DispatchEvents.PSARCS_IMPORTED, ret.flat());

            progress += 1;
            info.imports = ret.length;
            this.psarcToaster(toastID, progress, info);
        }
        else {
            progress += 1;
            info.imports = -1;
            this.psarcToaster(toastID, progress, info);
            DispatcherService.dispatch(DispatchEvents.PSARCS_IMPORTED, []);
        }

        setTimeout(() => toast.done(toastID), 2000);
    }
}

class profileWorker {
    /* copies stats from rocksmith profile */
    static startWork = async () => {
        await this.refreshStats();
        DispatcherService.dispatch(DispatchEvents.PROFILE_UPDATED, {});
    }

    static refreshToaster = (toastID = null, progress = 0, info = {}) => {
        const successmsg = (success) => (success ? "toast-msg-success" : "toast-msg-failure");
        const successicon = (success) => (success ? "fa-check-circle" : "fa-times-circle");
        const iconclass = (pr, success) => (<i className={"fas " + (progress >= pr ? successicon(success) : "fa-circle-notch fa-spin")} />);

        const spanclass = (pr, name, success) => (
            <span className={(progress >= pr ? successmsg(success) : "") + " toast-msg"}>
                {name}
            </span>
        )
        const total = 3;
        const d = (
            <div>
                {
                    progress === total
                        ? <span className="toast-msg toast-msg-success"> Refresh Complete </span>
                        : <span className="toast-msg toast-msg-success"> Refreshing Stats... </span>
                }
                <hr style={{ marginBottom: 7 + 'px' }} />
                <div>
                    {iconclass(1, !(info.rpchanges === -1 || info.rpchanges2 === -1))}
                    {spanclass(1, "Recently Played", !(info.rpchanges === -1 || info.rpchanges2 === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.rpchanges} entries</span>
                </div>
                <div>
                    {iconclass(2, !(info.laschanges === -1))}
                    {spanclass(2, "Learn A Song", !(info.laschanges === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.laschanges} entries</span>
                </div>
                <div>
                    {iconclass(3, !(info.scoreattackchanges === -1))}
                    {spanclass(3, "Score Attack", !(info.scoreattackchanges === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.scoreattackchanges} entries</span>
                </div>
            </div>
        )
        if (toastID == null) {
            return toast(d, {
                progress,
                autoClose: false,
                className: "toast-bg",
            });
        }
        else {
            if (progress === total) {
                return toast.update(toastID, {
                    render: d,
                    progress: 0.95,
                });
            }
            else {
                return toast.update(toastID, {
                    render: d,
                    progress: progress / total,
                    autoClose: false,
                });
            }
        }
    }

    static refreshStats = async () => {
        let progress = 0;
        const prfldb = await getProfileConfig();
        if (prfldb === '' || prfldb === null) {
            toasterError("Error fetching profile info, no profile selected!");
            return;
        }
        if (prfldb.length > 0) {
            const toastID = this.refreshToaster();
            const steamProfile = await readProfile(prfldb);

            await initSongsOwnedDB();
            await updateProfileConfig(prfldb);
            const rpsongs = async (type) => {
                const stats = steamProfile.Songs;
                const sastats = steamProfile.SongsSA;
                const idDateArray = [];
                const keys = Object.keys(type === "las" ? stats : sastats);
                for (let i = 0; i < keys.length; i += 1) {
                    const stat = stats[keys[i]];
                    const dateTS = stat.TimeStamp;
                    idDateArray.push([keys[i], dateTS]);
                }
                return updateRecentlyPlayedSongsV2(idDateArray, type);
            }

            const lassongs = async () => {
                const stats = steamProfile.Stats.Songs;
                //const sastats = steamProfile.SongsSA;
                const keys = Object.keys(stats);
                const idDateArray = [];
                const historyArray = [];
                for (let i = 0; i < keys.length; i += 1) {
                    const stat = stats[keys[i]];
                    if ("MasteryPeak" in stat && "PlayedCount" in stat) {
                        const mastery = stat.MasteryPeak;
                        const played = stat.PlayedCount;
                        if ("MasteryLast" in stat && "DateLAS" in stat) {
                            const masteryLast = stat.MasteryLast;
                            const dateLAS = stat.DateLAS;
                            const dateLASts = moment(dateLAS).unix();
                            historyArray.push([keys[i], masteryLast, dateLASts]);
                        }
                        idDateArray.push([keys[i], mastery, played]);
                    }
                }
                await saveHistoryV2(historyArray);
                return updateMasteryandPlayedV2(idDateArray);
            }

            const scoreattacksongs = async () => {
                const idDateArray = [];
                const sastats = steamProfile.SongsSA;
                const keys = Object.keys(sastats);
                for (let i = 0; i < keys.length; i += 1) {
                    const stat = sastats[keys[i]];
                    let highestBadge = 0;
                    if (stat.Badges.Easy > 0) {
                        stat.Badges.Easy += 10;
                        highestBadge = stat.Badges.Easy;
                    }
                    if (stat.Badges.Medium > 0) {
                        stat.Badges.Medium += 20;
                        highestBadge = stat.Badges.Medium;
                    }
                    if (stat.Badges.Hard > 0) {
                        stat.Badges.Hard += 30;
                        highestBadge = stat.Badges.Hard;
                    }
                    if (stat.Badges.Master > 0) {
                        stat.Badges.Master += 40;
                        highestBadge = stat.Badges.Master;
                    }
                    idDateArray.push([keys[i], stat, highestBadge]);
                }
                return updateScoreAttackStatsV2(idDateArray);
            }

            const info = {
                rpchanges: 0,
                rpchanges2: 0,
                laschanges: 0,
                scoreattackchanges: 0,
            };
            let changes = await rpsongs("las")
            const changes2 = await rpsongs("sa");
            progress += 1;
            info.rpchanges = changes;
            info.rpchanges2 = changes2;
            this.refreshToaster(toastID, progress, info);

            changes = await lassongs();
            progress += 1;
            info.laschanges = changes;
            this.refreshToaster(toastID, progress, info);

            changes = await scoreattacksongs();
            progress += 1;
            info.scoreattackchanges = changes;
            this.refreshToaster(toastID, progress, info);

            setTimeout(() => toast.done(toastID), 2000);
        }
    }

    /* imports a rocksmith songlist as a setlist */
    /* accepts 'favorites' or a number between 1-7 */
    static startImport = async (setlist = "favorites") => {
        await this.importSetlist(setlist);
        DispatcherService.dispatch(DispatchEvents.SETLIST_IMPORTED, setlist)
    }

    static importToaster = (toastID = null, progress = 0, info = {}) => {
        const setlist = info.name;
        const successmsg = (success) => (success ? "toast-msg-success" : "toast-msg-failure");
        const successicon = (success) => (success ? "fa-check-circle" : "fa-times-circle");
        const iconclass = (pr, success) => (<i className={"fas " + (progress >= pr ? successicon(success) : "fa-circle-notch fa-spin")} />);

        const spanclass = (pr, name, success) => (
            <span className={(progress >= pr ? successmsg(success) : "") + " toast-msg"}>
                {name}
            </span>
        )
        const total = 1;
        const d = (
            <div>
                {
                    progress === total
                        ? <span className="toast-msg toast-msg-success"> Import Complete </span>
                        : <span className="toast-msg toast-msg-success"> Importing Song list... </span>
                }
                <hr style={{ marginBottom: 7 + 'px' }} />
                <div>
                    {iconclass(1, !(info.changes === -1))}
                    {spanclass(1, setlist, !(info.changes === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.changes} entries</span>
                </div>
            </div>
        )
        if (toastID == null) {
            return toast(d, {
                progress,
                autoClose: false,
                className: "toast-bg",
            });
        }
        else {
            if (progress === total) {
                return toast.update(toastID, {
                    render: d,
                    progress: 0.95,
                });
            }
            else {
                return toast.update(toastID, {
                    render: d,
                    progress: progress / total,
                    autoClose: false,
                });
            }
        }
    }

    static importSetlist = async (setlist) => {
        let progress = 0;
        const prfldb = await getProfileConfig();
        if (prfldb === '' || prfldb === null) {
            toasterError("Error fetching profile info, no profile selected!");
            return;
        }
        if (prfldb.length > 0) {
            await initSongsOwnedDB();
            await updateProfileConfig(prfldb);
            const info = { changes: 0, name: setlist, id: '' }
            const steamProfile = await readProfile(prfldb);

            let toastID = null;
            if (setlist === 'favorites') {
                info.name = "Favorites";
                info.id = "setlist_favorites";
                await initSetlistPlaylistDB(info.id);
                await resetRSSongList(info.id);
                toastID = this.importToaster(null, 0, info);

                const stats = steamProfile.FavoritesListRoot.FavoritesList;
                const changes = await addToFavoritesV2(stats);
                progress += 1;
                info.changes = changes;
                this.importToaster(toastID, progress, info);
            }
            else if (Number.isInteger(setlist) && (setlist > 0 && setlist < 7)) {
                info.name = `RS Song List ${setlist}`;
                info.id = `rs_song_list_${setlist}`;
                await createRSSongList(info.id, info.name, false, false, false, true);
                await resetRSSongList(info.id);

                toastID = this.importToaster(null, 0, info);

                const songRoot = steamProfile.SongListsRoot.SongLists;
                const stats = songRoot[setlist - 1] === 'undefined' ? [] : songRoot[setlist - 1];

                const changes = await addToFavoritesV2(stats, info.id);
                progress += 1;
                info.changes = changes;
                this.importToaster(toastID, progress, info);
            }
            else {
                toasterError("Invalid setlist: " + setlist);
                return;
            }
            setTimeout(() => toast.dismiss(toastID), 2000);
        }
    }

    /* imports dlc packs as setlist */
    static startDLCPackImport = async () => {
        await this.dlcPackImport();
        DispatcherService.dispatch(DispatchEvents.SETLIST_REFRESH);
    }

    static dlcImportToaster = (toastID = null, progress = 0, info = {}) => {
        const successmsg = (success) => (success ? "toast-msg-success" : "toast-msg-failure");
        const successicon = (success) => (success ? "fa-check-circle" : "fa-times-circle");
        const iconclass = (pr, success) => (<i className={"fas " + (progress >= pr ? successicon(success) : "fa-circle-notch fa-spin")} />);

        const spanclass = (pr, name, success) => (
            <span className={(progress >= pr ? successmsg(success) : "") + " toast-msg"}>
                {name}
            </span>
        )
        const total = 2;
        const d = (
            <div>
                {
                    progress === total
                        ? <span className="toast-msg toast-msg-success"> Import Complete </span>
                        : <span className="toast-msg toast-msg-success"> Importing DLC Packs as Setlists  </span>
                }
                <hr style={{ marginBottom: 7 + 'px' }} />
                <div>
                    {iconclass(1, !(info.grouped === -1))}
                    {spanclass(1, "DLC Packs", !(info.grouped === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.grouped} entries</span>
                </div>
                <div>
                    {iconclass(2, !(info.changes === -1))}
                    {spanclass(2, "Setlists", !(info.changes === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.changes} entries</span>
                </div>
            </div>
        )
        if (toastID == null) {
            return toast(d, {
                progress,
                autoClose: false,
                className: "toast-bg",
            });
        }
        else {
            if (progress === total) {
                return toast.update(toastID, {
                    render: d,
                    progress: 0.95,
                });
            }
            else {
                return toast.update(toastID, {
                    render: d,
                    progress: progress / total,
                    autoClose: false,
                });
            }
        }
    }

    static dlcPackImport = async () => {
        let progress = 0;
        const info = { changes: 0, grouped: 0 };
        const toastID = this.dlcImportToaster(null, 0, info);
        const datasrc = "https://gist.githubusercontent.com/JustinAiken/0cba27a4161a2ed3ad54fb6a58da2e70/raw";
        const data = await fetch(datasrc);
        const body = await data.text();
        const lines = body.split("\n");

        const getPartsFromLine = (line) => {
            const l2 = line.replace(/'/gi, "_");
            const items = parse(l2)[0];
            const release = items[0];
            const name = items[1];
            const pid = items[4];
            return { release, name, pid };
        }
        const grouped = [];
        for (let i = 0; i < lines.length; i += 1) {
            const parts = getPartsFromLine(lines[i]);
            const obj = { release: parts.release, name: parts.name, pid: [parts.pid] };
            for (let j = i + 1; j < lines.length; j += 1) {
                const checkparts = getPartsFromLine(lines[j]);
                if (parts.name === checkparts.name && parts.release === checkparts.release) {
                    obj.pid.push(checkparts.pid);
                    i += 1;
                }
                else {
                    break;
                }
            }
            grouped.push(obj);
        }

        progress += 1
        info.grouped = grouped.length;
        this.dlcImportToaster(toastID, progress, info);
        await createRSSongList("folder_dlcpack_import", "DLC Pack Setlists",
            false, false, false, false, false, true);
        const changes = await createSetlistFromDLCPack(grouped, "folder_dlcpack_import");
        progress += 1
        info.changes = changes;
        this.dlcImportToaster(toastID, progress, info);

        setTimeout(() => toast.done(toastID), 2000);
    }

    /* imports offline dlc catalog */
    static startSteamDLCCatalogImport = async () => {
        await this.dlcCatalogImport();
        DispatcherService.dispatch(DispatchEvents.DLC_CATALOG_UPDATED);
    }

    static dlcToaster = (entries, type) => {
        const iconclass = () => <i className="fas fa-check-circle" />;
        const spanclass = (name) => (
            <span className="toast-msg-success toast-msg">
                {name}
            </span>
        )
        const d = (
            <div>
                <span className="toast-msg toast-msg-success"> DLC Catalog Updated  </span>
                <hr style={{ marginBottom: 7 + 'px' }} />
                <div>
                    {iconclass()}
                    {spanclass(type)}
                    <span className="toast-msg toast-msg-info ta-right">{entries} entries</span>
                </div>
            </div>
        )
        toast(d, {
            autoClose: true,
            className: "toast-bg",
        });
    }

    static dlcCatalogImport = async () => {
        const data = window.electronFS.readFileSync(window.dirname + "/../songs_available_steam.csv");
        const lines = data.toString().split("\n");

        await addToSteamDLCCatalogV2(lines);
        this.dlcToaster(lines.length, "Offline Copy");
    }

    /* ypdates song_owned with results from psarc import */
    static songListToaster = (toastID = null, progress = 0, info = {}) => {
        const successmsg = (success) => (success ? "toast-msg-success" : "toast-msg-failure");
        const successicon = (success) => (success ? "fa-check-circle" : "fa-times-circle");
        const iconclass = (pr, success) => (<i className={"fas " + (progress >= pr ? successicon(success) : "fa-circle-notch fa-spin")} />);

        const spanclass = (pr, name, success) => (
            <span className={(progress >= pr ? successmsg(success) : "") + " toast-msg"}>
                {name}
            </span>
        )
        const total = info.cdlc ? 3 : 2;
        const d = (
            <div>
                {
                    progress === total
                        ? <span className="toast-msg toast-msg-success"> Update Complete</span>
                        : <span className="toast-msg toast-msg-success"> Updating Songs Owned   </span>
                }
                <hr style={{ marginBottom: 7 + 'px' }} />
                <div>
                    {iconclass(1, !(info.arrangements === -1))}
                    {spanclass(1, "Arrangements Found", !(info.arrangements === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.arrangements}</span>
                </div>
                <div>
                    {iconclass(2, !(info.inserts === -1))}
                    {spanclass(2, "Arrangements Added", !(info.inserts === -1))}
                    <span className="toast-msg toast-msg-info ta-right">{info.inserts}</span>
                </div>
                {
                    info.cdlc ? (
                        <div>
                            {iconclass(2, !(info.cdlcupdates === -1))}
                            {spanclass(2, "Marked as cdlc", !(info.cdlcupdates === -1))}
                            <span className="toast-msg toast-msg-info ta-right">{info.cdlcupdates}</span>
                        </div>
                    ) : null
                }
            </div>
        )
        if (toastID == null) {
            return toast(d, {
                progress,
                autoClose: false,
                className: "toast-bg",
            });
        }
        else {
            if (progress === total) {
                return toast.update(toastID, {
                    render: d,
                    progress: 0.95,
                });
            }
            else {
                return toast.update(toastID, {
                    render: d,
                    progress: progress / total,
                    autoClose: false,
                });
            }
        }
    }

    static startSongListUpdate = async (songs = [], markAsCDLC = false) => {
        await this.songListUpdate(songs, markAsCDLC);
        DispatcherService.dispatch(DispatchEvents.SONG_LIST_UPDATED);
    }

    static songListUpdate = async (songs, markAsCDLC) => {
        console.log("--start songlist update--");
        let progress = 0;
        const info = {
            arrangements: 0, inserts: 0, cdlc: markAsCDLC, cdlcupdates: 0,
        };
        console.log("arrangements:", songs.length);
        console.log("mark as cdlc:", markAsCDLC);

        const toastID = this.songListToaster(null, 0, info);
        const filtered = songs.filter(item => (!item.song.startsWith("RS2 Test")
            && !item.song.startsWith("RS2 Chord")))
        console.log("filtered: " + filtered.length);

        progress += 1
        info.arrangements = filtered.length;
        this.songListToaster(toastID, progress, info);
        await initSongsOwnedDB();
        let changes = await updateSongsOwnedV2(filtered, markAsCDLC);
        console.log("inserts: " + changes);

        progress += 1
        info.inserts = changes;
        this.songListToaster(toastID, progress, info);
        changes = await removeIgnoredArrangements();
        console.log("removeIgnored: " + changes);

        if (markAsCDLC) {
            changes = await updateCDLCStatV2(filtered);
            progress += 1
            info.cdlcupdates = changes;
            this.songListToaster(toastID, progress, info);
            console.log("updateCDLCStat: " + changes);
        }
        setTimeout(() => toast.dismiss(toastID), 2000);
        console.log("--end songlist update--");
    }
}

class imageWorker {
    static fetchCover = async (artist, albumortrack, usealbum = true, data = {}) => {
        const a1 = artist.split("feat.")[0].trim();
        let url = "https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg";
        const options = {
            size: 'large',
        }
        if (usealbum) options.album = albumortrack
        else options.track = albumortrack
        url = await albumArt(
            a1,
            options,
        );
        if (url.toString().toLowerCase().includes("error:")) {
            url = await albumArt(
                a1,
                { size: 'large' },
            );
        }
        if (!url.toString().includes("http") || url.toString().toLowerCase().includes('rate limit exceeded')) {
            console.warn(url);
            url = "https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg";
        }
        DispatcherService.dispatch(DispatchEvents.ALBUM_COVER_QUERY, { url, ...data });
    }
}

export {
    profileWorker,
    psarcWorker,
    imageWorker,
}
