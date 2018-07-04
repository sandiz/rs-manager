window.ipcRenderer = require("electron").ipcRenderer;
window.app = require("electron").app;
window.shell = require("electron").shell;
window.remote = require('electron').remote;
window.electronFS = window.remote.require('fs');
window.spawn = require("await-spawn");
window.dirname = __dirname;
window.sqlite = require("sqlite");
window.fetch = fetch;
window.http = require("http");
window.os = require("os");
window.prompt = require('electron-prompt');

const rp = require('request-promise');



window.request = async function (uri, cookie, cookieurl, qs) {

    let cookiejar = rp.jar();
    //cookiejar.setCookie('steamLoginSecure=76561197985613182%7C%7C4B2D9C3BFDDB12750CD0BB9086C188AAD7051295', 'https://store.steampowered.com');
    if (cookie != "") {
        cookiejar.setCookie(cookie, cookieurl);
    }
    const options = {
        //uri: 'https://store.steampowered.com/dynamicstore/userdata/',
        uri,
        jar: cookiejar, // Tells rp to include cookies in jar that match uri,
        qs,
    };
    const d = await rp(options);
    return d;
}


