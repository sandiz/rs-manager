import pyaudio
import wave

p = pyaudio.PyAudio()
info = p.get_host_api_info_by_index(0)
numdevices = info.get('deviceCount')
rsindex = -1
#for each audio device, determine if is an input or an output and add it to the appropriate list and dictionary
for i in range(0, numdevices):
    if p.get_device_info_by_host_api_device_index(
            0, i).get('maxInputChannels') > 0:
        print "Input Device id ", i, " - ", p.get_device_info_by_host_api_device_index(
            0, i).get('name')

    name = p.get_device_info_by_host_api_device_index(0, i).get('name')
    if p.get_device_info_by_host_api_device_index(
            0, i).get('maxOutputChannels') > 0:
        print "Output Device id ", i, " - ", name

    if name == "Rocksmith USB Guitar Adapter":
        rsindex = i

CHUNK = 1024
WIDTH = 4
CHANNELS = 1
RATE = 48000
RECORD_SECONDS = 300
WAVE_OUTPUT_FILENAME = "file.wav"
frames = []

stream = p.open(
    format=pyaudio.paInt16,
    channels=CHANNELS,
    rate=RATE,
    input=True,
    output=True,
    input_device_index=rsindex,
    frames_per_buffer=CHUNK)

print("* recording")

for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
    data = stream.read(CHUNK)
    stream.write(data, CHUNK)
    #frames.append(data)

print("* done")

stream.stop_stream()
stream.close()

p.terminate()
waveFile = wave.open(WAVE_OUTPUT_FILENAME, 'wb')
waveFile.setnchannels(CHANNELS)
waveFile.setsampwidth(WIDTH)
waveFile.setframerate(RATE)
waveFile.writeframes(b''.join(frames))
waveFile.close()
