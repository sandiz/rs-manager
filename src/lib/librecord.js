var portAudio = require('naudiodon');
const { pipeline } = require('stream');
var MemoryStream = require('memorystream');

var FileWriter = require('wav').FileWriter;

let ai = null;
let writestream = null;
async function startRecording(errcb, fincb) {
    if (ai != null) ai.quit();
    const devices = portAudio.getDevices();
    const rsDevice = {
        index: -1,
        name: "",
        maxInputChannels: -1,
        defaultSampleRate: -1,
        fileName: "",
    }
    for (let i = 0; i < devices.length; i += 1) {
        const device = devices[i]
        console.log(device);
        if (device.name.includes("Rocksmith USB Guitar Adapter")) {
            if (window.os.platform() === 'win32' && !device.hostAPIName.toLowerCase().includes("wasapi")) {
                continue;
            }
            console.log("chosen", device);
            rsDevice.index = device.id;
            rsDevice.name = device.name;
            rsDevice.maxInputChannels = device.maxInputChannels;
            rsDevice.defaultSampleRate = device.defaultSampleRate;
            break;
        }
    }
    if (rsDevice.index === -1) {
        return rsDevice;
    }

    const ts = new Date().getTime();
    const dirs = await remote.dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
        message: "Choose directory to save the recording to..",
        title: "Choose directory to save the recording to..",
        buttonLabel: "Save"
    });
    if (!dirs || dirs.canceled || dirs.filePaths <= 0) {
        rsDevice.index = -2;
        return rsDevice;
    }
    const results = dirs.filePaths[0];
    const file = window.path.join(results, "/rocksmith_raw_" + ts + ".wav");
    rsDevice.fileName = file;

    pipeline(
        aiStream(rsDevice),
        new MemoryStream(),
        writeStream(file),
        (err) => {
            if (err) {
                console.log(err);
                errcb(err);
            }
            else {
                fincb(file);
            }
        }
    );
    ai.start();
    return rsDevice;
}

function aiStream(rsDevice) {
    ai = new portAudio.AudioInput({
        channelCount: rsDevice.maxInputChannels,
        sampleFormat: portAudio.SampleFormat16Bit,
        sampleRate: rsDevice.defaultSampleRate,
        deviceId: rsDevice.index,
    });
    return ai;
}

function writeStream(file, ) {
    writestream = new FileWriter(file, {
        sampleRate: 48000,
        channels: 1,
        bitDepth: 16,
    });
    return writestream;
}

function stopRecording() {
    if (ai != null) {
        ai.quit();
        ai = null;
    }
    if (writestream != null) {
        writestream.end();
        writestream = null;
    }
}

exports.startRecording = startRecording;
exports.stopRecording = stopRecording;