const spawn = require('cross-spawn');
const fs = require("fs");

if (process.argv.length <= 2) {
    console.log("Need platform (win/mac)");
    process.exit(-1);
}
const buildPlatform = process.argv[2];

let platform = ""
let icon = ""
let extra_ignore = ""
if (buildPlatform === "win") {
    platform = "win32";
    icon = "src/assets/icons/win/rs.ico"
    extra_ignore = "node_modules/.cache"
}
else if (buildPlatform === "mac") {
    platform = "darwin"
    icon = "src/assets/icons/mac/mac.icns"
    extra_ignore = ".node_modules/.cache"
}
else {
    console.log("Invalid buildPlatform, valid options: mac, win");
    process.exit(-1);
}

const yt = process.env.YOUTUBE_API_KEY
const lfm = process.env.LASTFM_API_KEY

const keys = {
    yt, lfm
};
console.log("updating api keys");
fs.writeFileSync("ncvxrl.json", JSON.stringify(keys));

const dir = "release-builds"
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

const child = spawn("yarn", [
    "run",
    "electron-packager",
    ".",
    "Rocksmith Manager",
    "--out=release-builds",
    "--overwrite",
    "--prune=true",
    "--arch=x64",
    `--platform=${platform}`,
    `--icon=${icon}`,
    "--ignore=config.dev.json",
    "--ignore=rsdb.dev.sqlite",
    "--ignore=screenshots/",
    "--ignore=docs/",
    "--ignore=src/lib/deni-react-treeview/node_modules/",
    "--ignore=src/lib/deni-react-treeview/gh-pages/",
    "--ignore=src/lib/deni-react-treeview/src/",
    extra_ignore.length > 0 ? `--ignore=${extra_ignore}` : ""
]);

child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});
child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    postbuild();
});


function postbuild() {
    if (buildPlatform === "mac") {
        process.chdir("release-builds/");
        const olddir = process.cwd();

        process.chdir("Rocksmith\ Manager-darwin-x64/Rocksmith\ Manager.app/Contents/Resources/app/");
        console.log("Running postbuild mac..");
        const c = spawn("find", [
            "node_modules",
            "-name",
            "*.d.ts",
            "-exec",
            "rm",
            "{}",
            ";"
        ]);

        //console.log(process.cwd());
        spawn("install_name_tool", [
            "-change",
            "@rpath/libportaudio.dylib",
            "node_modules/naudiodon/build/Release/libportaudio.dylib",
            "node_modules/naudiodon/build/Release/naudiodon.node"
        ]);
        console.log("Creating Zip/DMG...")
    }
    else if (buildPlatform == "win") {
        /*
        const outZip = "RocksmithManager-win32-x64.zip"
        console.log("Zipping to " + outZip);
        process.chdir("release-builds/");
        if (fs.existsSync(outZip))
            fs.unlinkSync(outZip);
        const ziper = spawn("7z", [
            "a",
            "-tzip",
            "-aoa",
            "-mx=7",
            "-mm=Deflate",
            "-bso1",
            "-bsp0",
            "-bd",
            "-bse2",
            "-bb2",
            "-r",
            outZip,
            "Rocksmith\ Manager-win32-x64/",
        ]);

        ziper.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            console.log("\n");
        });

        ziper.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
            console.log("\n");
        });

        ziper.on('exit', (code) => {
            console.log('child process exited with code ' + code.toString());
        });
        */
    }
}