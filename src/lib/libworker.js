
import sumWorker from './workers/sum.worker';

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

class profileWorker {
    constructor(c = (w, m) => { }, e = (w, e) => { }) {
        this._receivedMsg = c;
        this._receivedErr = e;
        this._init();
    }

    _init() {
        this._workerMgr = new WorkersManager();             // Initialize WorkersManager.
        this._workerMgr.setType('profile')      // Set file path.
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

export {
    profileWorker,
}

export default WorkersManager;
