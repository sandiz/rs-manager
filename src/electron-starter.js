const electron = require("electron");
var { app, BrowserWindow, Menu } = electron;
const path = require("path");
const url = require("url");
const d = require('debug')('index');
const isDev = require('electron-is-dev');
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1750,
        height: 1036,
        icon: path.join(__dirname, "./icons/png/icon-1024x1024.png"),
        webPreferences: {
            preload: path.join(__dirname, "./preload.js"),
            webSecurity: false,
        }
    });
    //mainWindow.maximize();
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    mainWindow.loadURL(
        process.env.ELECTRON_START_URL ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html"),
            protocol: "file:",
            slashes: true
        })
    );
    mainWindow.webContents.session.webRequest.onHeadersReceived({}, (d, c) => {
        if (d.responseHeaders['x-frame-options'] || d.responseHeaders['X-Frame-Options']) {
            delete d.responseHeaders['x-frame-options'];
            delete d.responseHeaders['X-Frame-Options'];
        }
        c({ cancel: false, responseHeaders: d.responseHeaders });
    });

    // Create the Application's main menu
    var template = [{
        label: "Application",
        submenu: [
            { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
            { type: "separator" },
            { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } }
        ]
    }, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]
    }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    //if (process.platform !== "darwin") {
    app.quit();
    //}
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
