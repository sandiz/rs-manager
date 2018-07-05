const electron = require("electron");
var { app, BrowserWindow } = electron;

const path = require("path");
const url = require("url");
const d = require('debug')('index');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1036,
        icon: path.join(__dirname, "./icons/png/icon-1024x1024.png"),
        webPreferences: {
            preload: path.join(__dirname , "./preload.js"),
            webSecurity: false,
        }
    });
    //mainWindow.maximize();
    mainWindow.webContents.openDevTools({mode: 'detach'});
    mainWindow.loadURL(
        process.env.ELECTRON_START_URL ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html"),
            protocol: "file:",
            slashes: true
        })
    );

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
