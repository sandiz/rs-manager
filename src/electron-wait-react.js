const net = require('net')
//const childProcess = require('child_process')
const spawn = require('cross-spawn');

const port = process.env.PORT ? process.env.PORT - 100 : 3000

process.env.ELECTRON_START_URL = `http://localhost:${port}`

const client = new net.Socket()

let startedElectron = false
const tryConnection = () => {
    client.connect({ port }, () => {
        client.end()
        if (!startedElectron) {
            console.log('starting electron')
            startedElectron = true
            //const exec = childProcess.exec
            //exec('npm run electron')
            const c = spawn("npm", [
                "run",
                "electron"
            ]);
            c.stdout.on('data', (data) => {
                console.info(`${data}`);
            });

            c.stderr.on('data', (data) => {
                console.error(`electron-err: ${data}`);
            });
            c.on('close', (code) => {
                console.info(`electron-exit code ${code}`);
            });
        }
    })
}

tryConnection()

client.on('error', () => {
    setTimeout(tryConnection, 1000)
})
