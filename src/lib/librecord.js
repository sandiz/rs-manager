var portAudio = require('naudiodon');
const { pipeline } = require('stream');
var MemoryStream = require('memorystream');

var FileWriter = require('wav').FileWriter;

let ai = null;
let writestream = null;
function startRecording(errcb) {
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
        if (device.name === "Rocksmith USB Guitar Adapter") {
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
    const dirs = remote.dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Choose directory to save to..",
    });
    const results = dirs[0];
    const file = results + "/rocksmith_raw_" + ts + ".wav";
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