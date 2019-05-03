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
        //dont replace new lines so that it fornats nicely in <pre> tags
        stderr = data.toString().trim();
    });
    child.on('error', (err) => {
        //eslint-disable-next-line
        reject({ code: -1, stderr: JSON.stringify(err) });
    })
    child.on('exit', (code) => {
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
    let importRSMPath = await getImportRSMConfig();
    const tmpobj = tmp.dirSync();
    let tmpdir = tmpobj.name.trim();

    let file = window.path.join(tmpdir, "songkeys.json");
    await writeFile(file, JSON.stringify(songKeys));

    /* escape spaces in path */
    importRSMPath = importRSMPath.replace(/(\s+)/g, '\\$1');
    file = file.replace(/(\s+)/g, '\\$1');
    tmpdir = tmpdir.replace(/(\s+)/g, '\\$1');

    console.log("importrsm path: " + importRSMPath);
    console.log("Creating tmp directory at: " + tmpdir);
    console.log("songkeys.json: " + file)

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
