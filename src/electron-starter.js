const electron = require("electron");
var { app, BrowserWindow, Menu, webFrame, ipcMain } = electron;
const path = require("path");
const url = require("url");
const isDev = require('electron-is-dev');
const windowStateKeeper = require('electron-window-state');
const openAboutWindow = require('about-window').default;

const i18n = require('./app-config/i18next.config').i18n;
const languages = require('./app-config/base-config').languages;
let currentLocale = 'en';

const setupEvents = require('./setupEvents');
if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

let mainWindow;

function createMenu() {
    // Create the Application's main menu
    var template = [{
        label: i18n.t("About"),
        submenu: [
            {
                label: i18n.t("About Application"), click: () => {
                    openAboutWindow({
                        icon_path: path.join(__dirname, "./assets/icons/icon-1024x1024.png"),
                        package_json_dir: path.join(__dirname, "../"),
                        copyright: 'Copyright (c) 2018 sandiz',
                        homepage: 'https://github.com/sandiz/rs-manager',
                    });
                }
            },
            { type: "separator" },
            { label: i18n.t("Quit"), accelerator: "Command+Q", click: function () { app.quit(); } }
        ]
    }, {
        label: i18n.t("Edit"),
        submenu: [
            { label: i18n.t("Undo"), accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: i18n.t("Redo"), accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: i18n.t("Cut"), accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: i18n.t("Copy"), accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: i18n.t("Paste"), accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: i18n.t("Select All"), accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
            { label: i18n.t("Toggle Developer Tools"), role: "toggleDevTools" }
        ]
    }, {
        label: i18n.t('View'),
        submenu: [
            {
                label: i18n.t('Reload'),
                accelerator: 'CmdOrCtrl+R',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload()
                }
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('Reset Zoom'),
                role: 'resetzoom'
            },
            {
                label: i18n.t('Zoom In'),
                role: 'zoomin'
            },
            {
                label: i18n.t('Zoom Out'),
                role: 'zoomout'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('Toggle Full Screen'),
                role: 'togglefullscreen'
            },
            {
                label: i18n.t('Toggle Full Screen (local)'),
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.setSimpleFullScreen(!focusedWindow.isSimpleFullScreen());
                }
            }
        ]
    },
    ];

    const languageMenu = languages.map((languageCode) => {
        return {
            label: i18n.t(languageCode),
            type: 'radio',
            checked: i18n.language === languageCode,
            click: () => {
                i18n.changeLanguage(languageCode);
            }
        }
    });

    template.push({
        label: i18n.t('Language'),
        submenu: languageMenu
    });

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
    // Load the previous state with fallback to defaults
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1750,
        defaultHeight: 1064
    });

    let frameOpts = {}
    if (process.platform !== 'win32') {
        frameOpts = {
            frame: false,
            titleBarStyle: 'hidden',
        };
    }

    // Create the window using the state information
    mainWindow = new BrowserWindow({
        id: 1,
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        show: false,
        ...frameOpts,
        icon: path.join(__dirname, "./icons/png/icon-1024x1024.png"),
        webPreferences: {
            preload: path.join(__dirname, "./preload.js"),
            webSecurity: false,
        },
    });
    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(mainWindow);
    mainWindow.setAutoHideMenuBar(true);
    mainWindow.setMinimumSize(1700, 1070);
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

    createMenu();

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })
}

app.on("ready", () => {
    createWindow();
    currentLocale = app.getLocale();
    // currentLocale = 'bn';
});

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

i18n.on('loaded', (loaded) => {
    i18n.changeLanguage(currentLocale);
    i18n.off('loaded');
});

i18n.on('languageChanged', (lng) => {
    createMenu();
    mainWindow.webContents.send('language-changed', {
        language: lng,
        namespace: 'translation',
        resource: i18n.getResourceBundle(lng, 'translation')
    });
});

ipcMain.on('get-initial-translations', (event, arg) => {
    const loc = currentLocale;
    i18n.loadLanguages(loc, (err, t) => {
        const initial = {};
        initial[loc] = {
            'translation': i18n.getResourceBundle(loc, 'translation')
        }
        event.returnValue = initial;
    });
});
