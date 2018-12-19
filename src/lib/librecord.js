var fs = require('fs');
var portAudio = require('naudiodon');
var os = require("os");
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
    ai = new portAudio.AudioInput({
        channelCount: rsDevice.maxInputChannels,
        sampleFormat: portAudio.SampleFormat8Bit,
        sampleRate: rsDevice.defaultSampleRate,
        deviceId: rsDevice.index,
    });
    const ts = new Date().getTime();
    const file = os.tmpdir() + "/rocksmith_raw_" + ts + ".wav";
    rsDevice.fileName = file;
    ws = new FileWriter(file, {
        sampleRate: 48000,
        channels: 1,
        bitDepth: 8,
    });

    ai.on('error', err => errcb(err));
    ai.pipe(ws);
    ai.start()
    return rsDevice;
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