window.ipcRenderer = require("electron").ipcRenderer;
window.app = require("electron").app;
window.shell = require("electron").shell;
window.remote = require('electron').remote;
window.webFrame = require('electron').webFrame;
window.electronFS = window.remote.require('fs');
window.spawn = require("await-spawn");
window.dirname = __dirname;
window.sqlite = require("sqlite");
window.fetch = fetch;
window.http = require("http");
window.os = require("os");
window.process = require("process");
window.prompt = require('electron-prompt');
window.findProcess = require('find-process');
window.processPSARC = require("./lib/libpsarc").processPSARC
window.extractFile = require("./lib/libpsarc").extractFile
process.chdir(__dirname + "/../") //change directory so that naudiodon can pick up portaudio dylib
window.libRecord = require("./lib/librecord");
process.chdir(__dirname)
window.sudo = require('sudo-prompt');
window.exec = require('child_process').exec;
window.linereader = require('line-by-line');
window.shortid = require('shortid');
window.pidusage = require('pidusage');
window.WaveFile = require('wavefile');
window.defaultZoom = 0.9;


const rp = require('request-promise');
const isDev = require('electron-is-dev');
const express = require('express')
const openid = require('openid');
const nodeUrl = require('url');
const util = require('util')
const https = require('https');
window.isDev = isDev;

const exp = express()
window.PROD_YT_PORT = 8000;
window.DEV_YT_PORT = 9000;
window.YT_PORT = isDev ? window.DEV_YT_PORT : window.PROD_YT_PORT;
window.path = null;

if (window.os.platform() === 'win32') {
    window.path = require("path").win32;
}
else {
    window.path = require("path");
}

const ncvxrl = window.path.resolve(window.dirname + '/../ncvxrl.json')
window.keys = {
    yt: '',
    lfm: '',
    path: ncvxrl,
}
const data = window.electronFS.readFileSync(ncvxrl);
const body = JSON.parse(data);
window.keys.yt = body.yt;
window.keys.lfm = body.lfm;


window.request = async function (uri, cookies, cookieurl, qs, form, method = "GET") {

    let cookiejar = rp.jar();
    //cookiejar.setCookie('steamLoginSecure=76561197985613182%7C%7C4B2D9C3BFDDB12750CD0BB9086C188AAD7051295', 'https://store.steampowered.com');
    if (Array.isArray(cookies)) {
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            console.log("adding cookie: ", cookie);
            cookiejar.setCookie(cookie, cookieurl);
        }
    }
    const options = {
        method,
        //uri: 'https://store.steampowered.com/dynamicstore/userdata/',
        uri,
        jar: cookiejar, // Tells rp to include cookies in jar that match uri,
        qs,
        form,
    };
    //console.log(options);
    try {
        const d = await rp(options);
        return d;
    }
    catch (error) {
        return "{\"html\": \"\"}";
    }
}


if (isDev) {
    window.configPath = path.resolve(window.dirname + "/../config.dev.json");
    window.sqlitePath = path.resolve(window.dirname + "/../rsdb.dev.sqlite");
}
else {
    window.configPath = path.resolve(window.remote.app.getPath("userData") + "/config.json");
    window.sqlitePath = path.resolve(window.remote.app.getPath("userData") + "/rsdb.sqlite");
}

// Warn if overriding existing method
if (Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

/* we start a local youtube http proxy because youtube doesnt like serving monetized videos to file:// sources */
exp.listen(window.YT_PORT, () => console.log(`RSManager listening on port ${window.YT_PORT} for yt requests (/yt/:vid).`))
exp.get('/yt/:vid', (req, res) => res.send(`<iframe id="yt-video" allowFullScreen style="height:95%;width:100%" src="https://www.youtube.com/embed/${req.params.vid}?modestbranding=0;&rel=0&amp;&amp;showinfo=0"" frameborder="0"></iframe>`))

window.STEAM_AUTH_URL = "http://localhost:" + window.YT_PORT
const relyingParty = new openid.RelyingParty(
    window.STEAM_AUTH_URL + "/verify-steam",
    window.STEAM_AUTH_URL,
    true,
    false,
    []
);
const getCookie = filter => new Promise((resolve, reject) => {
    window.remote.session.defaultSession.cookies.get(filter, (error, cookies) => {
        if (error) reject(error);
        else resolve(cookies);
    })
});

exp.get('/verify-steam', async (req, res) => {
    relyingParty.verifyAssertion(req, async (err, result) => {
        if (err) {
            console.log(err);
            console.log(JSON.stringify(err));
            res.end("Error.")
        } else if (!result || !result.authenticated) {
            res.end('Failed to authenticate user.');
        } else {
            steamID = result.claimedIdentifier.replace('https://steamcommunity.com/openid/id/', '');
            res.write("Logged in.");
            res.end();
        }
    });
})

/* make cookies set by steam not expire */
var cookies = window.remote.session.defaultSession.cookies;
ch = (event, cookie, cause, removed) => {
    cookies.off('changed', ch);
    if (cookie.session && !removed) {
        var url = util.format('%s://%s%s', (!cookie.httpOnly && cookie.secure) ? 'https' : 'http', cookie.domain, cookie.path);
        cookies.set({
            url: url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: Math.floor(new Date().getTime() / 1000) + 1209600
        }, function (err) {
            if (err) {
                //console.error('Error trying to persist cookie', err, cookie);
            }
        });
    }
}
cookies.on('changed', ch);

window.steamAuth = async () => {
    const windowParams = {
        alwaysOnTop: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            'web-security': false,
        }
    }
    const config = {
        redirectUri: 'http://localhost'
    };

    const auth = electronSteamAuth(config, windowParams);
    const options = {
        relyingParty,
    }
    const token = await auth.authenticate(options);
    return token;
}

function electronSteamAuth(config, windowParams) {
    authenticate = async (opts) => {
        opts = opts || {};

        var rely = opts.relyingParty;

        return new Promise(function (resolve, reject) {
            rely.authenticate('https://steamcommunity.com/openid', false, function (error, providerUrl) {
                const authWindow = new window.remote.BrowserWindow(windowParams || { 'use-content-size': true });

                authWindow.loadURL(providerUrl);
                authWindow.show();

                authWindow.on('closed', () => {
                    reject(new Error('window was closed by user'));
                });

                onCallback = async (url) => {
                    var query = nodeUrl.parse(url, true).query;
                    if (query['openid.identity'] === undefined) {
                        reject(new Error('cannot authenticate through Steam'));
                        authWindow.removeAllListeners('closed');
                        setImmediate(function () {
                            authWindow.close();
                        });
                    } else {
                        const sls = await getCookie({
                            name: 'steamLoginSecure',
                            domain: 'store.steampowered.com'
                        });
                        const sid = await getCookie({
                            name: 'sessionid',
                        })
                        const cookie = sls[0].value
                        const cookieSess = sid[0].value
                        resolve({
                            response_nonce: query['openid.response_nonce'],
                            assoc_handle: query['openid.assoc_handle'],
                            identity: query['openid.identity'],
                            steam_id: query['openid.identity'].match(/\/id\/(.*$)/)[1],
                            sig: query['openid.sig'],
                            cookie,
                            cookieSess,
                        });
                        authWindow.removeAllListeners('closed');
                        setImmediate(function () {
                            authWindow.close();
                        });
                    }
                }

                window.remote.session.defaultSession.webRequest.onBeforeRedirect({}, (details, callback) => {
                    onCallback(details.redirectURL)
                })

            });
        });
    }

    return {
        authenticate: authenticate
    };
};

window.openInfographic = async (path) => {
    const windowParams = {
        height: 1050,
        autoHideMenuBar: true,
        'use-content-size': true,
        webPreferences: {
            nodeIntegration: false,
            'web-security': false,
            preload: window.path.join(__dirname, "./preload2.js"),
        },
        frame: false,
        show: false,
    }
    const authWindow = new window.remote.BrowserWindow(windowParams || { 'use-content-size': true });
    authWindow.loadURL(path);
    if (isDev) {
        authWindow.webContents.openDevTools({ mode: 'detach' });
    }

    return authWindow;
}

_exp = () => {
    window.remote.app.off('quit', _exp);
    exp.close();
}
window.remote.app.on("quit", _exp);

process.once('loaded', () => {
    global.window = window;
    //electron.webFrame.setZoomFactor(defaultZoom);
})

window.pDownload = (url, dest) => {
    var file = window.electronFS.createWriteStream(dest);
    return new Promise((resolve, reject) => {
        var responseSent = false; // flag to make sure that response is sent only once.
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    if (responseSent) return;
                    responseSent = true;
                    resolve();
                });
            });
        }).on('error', err => {
            if (responseSent) return;
            responseSent = true;
            reject(err);
        });
    });
}
