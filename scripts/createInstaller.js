const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
    .then(createWindowsInstaller)
    .catch((error) => {
        console.error(error.message || error)
        process.exit(1)
    })

function getInstallerConfig() {
    console.log('creating windows installer')
    const rootPath = path.join('./')
    const outPath = path.join(rootPath, 'release-builds')

    return Promise.resolve({
        appDirectory: path.join(outPath, 'Rocksmith Manager-win32-x64/'),
        authors: 'sandiz',
        noMsi: true,
        outputDirectory: outPath,
        exe: 'Rocksmith Manager.exe',
        setupExe: 'RocksmithManagerInstaller.exe',
        setupIcon: path.join(rootPath, 'src', 'assets', 'icons', 'win', 'rs.ico')
    })
}