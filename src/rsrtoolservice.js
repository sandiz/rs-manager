import { getImportRSMConfig, writeFile } from "./configService";

//import { writeFile, readFile } from "./configService";
const shellEnv = window.require('shell-env');
const spawn = window.require('cross-spawn');
const tmp = window.require('tmp');
tmp.setGracefulCleanup();


const spawnPromise = (cmd, args) => new Promise((resolve, reject) => {
    const se = shellEnv.sync();
    const child = spawn(cmd, args, {
        deteched: true,
        shell: true,
        windowsHide: true,
        env: se,
    });
    let output = "";
    let stderr = "";

    child.stdout.on('data', (data) => {
        output = data.toString().replace(/\n|\r/g, "").trim()
    });
    child.stderr.on('data', (data) => {
        stderr = data.toString().replace(/\n|\r/g, "").trim()
    });
    child.on('close', (code) => {
        if (code === 0) {
            resolve(output);
        }
        else {
            //eslint-disable-next-line
            reject({
                code,
                stderr,
            });
        }
    })
})

export const detectImportRSMPath = async () => {
    if (window.process.platform === "darwin") {
        try {
            console.log("trying to detect importrsm path");
            const path = await spawnPromise("/usr/bin/which", ["importrsm"])
            console.log(path);
            return path;
        }
        catch (ex) {
            console.log('failed to find importrsm: ' + JSON.stringify(ex))
            return '';
        }
    }
    else {
        try {
            console.log("trying to detect importrsm path");
            const path = await spawnPromise("where", ["importrsm.exe"])
            console.log(path);
            return path;
        }
        catch (ex) {
            console.log('failed to find importrsm: ' + JSON.stringify(ex))
            return '';
        }
    }
}

export const executeRSMRequest = async (steamID, profileName, songList, songKeys) => {
    const importRSMPath = await getImportRSMConfig();
    const tmpobj = tmp.dirSync();
    const tmpdir = tmpobj.name.trim();

    const file = window.path.join(tmpdir, "songkeys.json");
    await writeFile(file, JSON.stringify(songKeys));

    if (window.process.platform === "darwin") {
        try {
            const output = await spawnPromise(importRSMPath, [
                "--silent",
                "-a",
                steamID,
                "-p",
                profileName,
                "-sl",
                songList,
                file,
                tmpdir,
            ])
            tmpobj.removeCallback();
            return [true, output, tmpdir];
        }
        catch (ex) {
            tmpobj.removeCallback();
            return [false, ex.stderr];
        }
    }
    else {
        try {
            const output = await spawnPromise(importRSMPath, [
                "--silent",
                "-a",
                steamID,
                "-p",
                profileName,
                "-sl",
                songList,
                file,
                tmpdir,
            ])
            tmpobj.removeCallback();
            return [true, output, tmpdir];
        }
        catch (ex) {
            tmpobj.removeCallback();
            return [false, ex.stderr];
        }
    }
}
