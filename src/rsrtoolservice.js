//import { writeFile, readFile } from "./configService";
const spawn = window.require('cross-spawn');

const spawnPromise = (cmd, args) => new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let output = "";

    child.stdout.on('data', (data) => {
        output = data.toString().replace(/\n|\r/g, "").trim()
    });
    child.on('close', (code) => {
        if (code === 0) {
            resolve(output);
        }
        else {
            reject(code);
        }
    })
})

export const detectImportRSMPath = async () => {
    if (window.process.platform === "darwin") {
        try {
            const path = await spawnPromise("which", ["importrsm"])
            return path;
        }
        catch (ex) {
            console.log('failed to find importrsm: ' + ex)
            return '';
        }
    }
    else {
        console.log('win impl');
    }
    return '';
}

export const executeRSMRequest = () => {

}
