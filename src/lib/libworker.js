import { toast } from 'react-toastify';
import moment from 'moment';
import React from 'react';
import sumWorker from './workers/sum.worker';
import { DispatcherService, DispatchEvents } from './libdispatcher';
import {
    initSongsOwnedDB, updateRecentlyPlayedSongsV2,
    updateMasteryandPlayedV2, updateScoreAttackStatsV2,
    saveHistoryV2, addToFavoritesV2, initSetlistPlaylistDB, createRSSongList, resetRSSongList,
} from '../sqliteService';
import { toasterError } from '../App';
import getProfileConfig, { updateProfileConfig } from '../configService'
import readProfile from '../steamprofileService';

const Events = require('events-es5');

class WorkersManager {
    constructor() {
        this._data = null;
        this._dataDone = null;
        this._workers = [];
        this._hasErr = false;
        this._numOfWorkers = 1; // Default.
        this.events = new Events('message', 'error');
        this._type = null; //type of worker
        this._valid_types = ['profile', 'psarc'];
    }

    /**
     * Destroy the instance.
     * @return <em>undefined</em>
     */
    destroy() {
        const len = this._workers.length;

        for (let i = 0; i < len; i += 1) {
            this._workers[i].terminate();
        }

        // Util.destroy(this); // TODO
    }

    setType(type) {
        if (!this._valid_types.includes(type)) {
            throw new Error('Invalid type: ' + type);
        }
        this._type = type;
        return this;
    }

    hasErr() {
        return this._hasErr;
    }

    _isReady() {
        return (this._type && this._data);
    }

    /**
    * @param data {Array}
    * @returns {WorkersManager} A pointer to this instance, allowing call chaining.
    */
    setData(data) {
        if (!(data instanceof Array)
            || data.length < 1) {
            throw new Error("IllegalArgumentException: data must be a non-empty Array.");
        }

        this._data = data;
        return this;
    }

    /**
    * @param num {Positive Integer}
    * @returns {WorkersManager} A pointer to this instance, allowing call chaining.
    */
    setNumOfWorkers(num) {
        if (typeof num !== 'number'
            || num % 1 !== 0
            || num < 1) {
            throw new Error("IllegalArgumentException: num must be a positive integer.");
        }

        this._numOfWorkers = num;
        return this;
    }

    /**
    * @returns {WorkersManager} A pointer to this instance, allowing call chaining.
    */
    startWork() {
        if (!this._isReady()) {
            throw new Error("IllegalStateException: worker path or data have not been set yet.");
        }

        if (this._workers.length === 0) {
            this._initWorkers();
        }
        this._hasErr = false;
        this._dataDone = [];

        const data = this._data;
        const len = data.length;
        const workers = this._workers;
        const lenWorkers = this._numOfWorkers;
        const numPerWkr = Math.ceil(len / lenWorkers);

        for (let i = 0; i < lenWorkers; i += 1) {
            const wkr = workers[i];
            const start = i * numPerWkr;
            const end = (i + 1) * numPerWkr;
            const block = data.slice(start, end);
            const info = {
                /**
                * Because we used Math.ceil() to get the amount 
                * of work each Worker is going to do, it is possible
                * that the last Worker has less 'burden'.
                * 'block.length' indicates the real
                * length, but not (end - start).
                */
                workerId: i,
                data: block,
                start,
                end: start + block.length,
            };
            wkr.postMessage(info);
        }

        return this;
    }

    _receivedMsg(e) {
        if (!this._hasErr) {
            this._collectData(e.data);
        }
    }

    _collectData(info) {
        this._dataDone.push(info);

        if (this._dataDone.length === this._numOfWorkers) {
            this._composeData();
        }
    }

    _sortData(d1, d2) {
        return d1.workerId - d2.workerId;
    }

    _composeData() {
        this._dataDone.sort(this._sortData);

        const data = this._dataDone;
        const len = data.length;
        let ret = [];

        for (let i = 0; i < len; i += 1) {
            ret = ret.concat(data[i].data);
        }

        this.events.send('message', this, ret);
    }

    _receivedErr(e) {
        console.log(e);
        this._hasErr = true;
        this.events.send('error', this);
    }

    _initWorkers() {
        const workers = [];
        const fn = this._receivedMsg.bind(this);
        const fnErr = this._receivedErr.bind(this);
        //const path = this._path;

        for (let i = 0; i < this._numOfWorkers; i += 1) {
            let w;
            switch (this._type) {
                case 'profile':
                    w = new sumWorker();
                    break;
                default:
                    throw new Error("invalid type to init: " + this._type);
            }
            //const w = new Worker(path);
            w.onmessage = fn;
            w.onerror = fnErr;
            workers.push(w);
        }

        this._workers = workers;
    }
}

class psarcWorker {
    constructor(c = (w, m) => { }, e = (w, err) => { }) {
        this._receivedMsg = c;
        this._receivedErr = e;
        this._init();
    }

    _init() {
        this._workerMgr = new WorkersManager();             // Initialize WorkersManager.
        this._workerMgr.setType('psarc')      // Set file path.
            .setNumOfWorkers(navigator.hardwareConcurrency || 2)     // Default is 1.
            .events.bind('message', this._receivedMsg)    // Bind events.
            .bind('error', this._receivedErr);   // Chainable.
    }

    getWorkerMgr() {
        return this._workerMgr;
    }

    setData(data) {
        this._workerMgr.setData(data);
        return this;
    }

    startWork() {
        this._workerMgr.startWork();
        return this;
    }
}

class profileWorker {
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

    /* accepts 'favorites' or a number between 1-7 */
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
}

export {
    profileWorker,
    psarcWorker,
}

/*
const _finishCb = (workerMgr, msg) => {
  console.log(msg);
  workerMgr.destroy();
}

const _errCb = (workerMgr, err) => {
  console.log(err);
  workerMgr.destroy();
}
const pw = new profileWorker(_finishCb, _errCb);
const data = [[1, 2], [1, 1, 1], [0], [4], [1, 1, 1, 1, 1], [2, 2], [-1, 1], [0], [12]];
pw.setData(data).startWork();
*/

export default WorkersManager;
