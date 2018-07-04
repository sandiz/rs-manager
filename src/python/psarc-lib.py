from lib.rocksmith import PSARC
import json, struct, zlib, getopt, math, sys, traceback, os, time, random, string


def extract_file(psarc, fileToExtract):
    with open(psarc, 'rb') as fh:
        content = PSARC(True).parse_stream(fh)
        for filepath, data in content.items():
            if (filepath == fileToExtract):
                filename = "/tmp/" + str(int(
                    time.time())) + "_" + os.path.basename(fileToExtract)
                with open(filename, "wb") as wh:
                    wh.write(data)
                    data = {}
                    data["filename"] = filename
                    print(json.dumps(data, sort_keys=False))
                    break
    pass


def read_psarc(psarc):
    psarcData = {}
    files = []
    arrangments = []
    with open(psarc, 'rb') as fh:
        content = PSARC(True).parse_stream(fh)
        for filepath, data in content.items():
            files.append(filepath)
            if "json" in filepath:
                arrgmentData = json.loads(data)
                if "Entries" not in arrgmentData:
                    continue
                for id in arrgmentData["Entries"]:
                    data = arrgmentData["Entries"][id]["Attributes"]
                    songDict = {}
                    songDict["album"] = data.get("AlbumName", "")
                    songDict["artist"] = data.get("ArtistName", "")
                    songDict["song"] = data.get("SongName", "")
                    songDict["arrangement"] = data.get("ArrangementName", "")
                    if (songDict["arrangement"] == "Combo"):
                        songDict["arrangement"] = "LeadCombo"
                    if (songDict["arrangement"] == "Vocals"):
                        continue
                    songDict["json"] = filepath
                    songDict["psarc"] = os.path.basename(psarc)
                    songDict["dlc"] = data.get("DLC", False)
                    songDict["sku"] = data.get("SKU", "")
                    songDict["difficulty"] = data.get("SongDifficulty",
                                                      0) * 100
                    songDict["dlckey"] = data.get("DLCKey", "")
                    songDict["songkey"] = data.get("SongKey", "")
                    songDict["fullName"] = data.get("FullName", "")
                    songDict["lastConversionTime"] = data.get(
                        "LastConversionDateTime", "")
                    songDict["id"] = data.get("PersistentID", ''.join(
                        random.choices(
                            string.ascii_uppercase + string.digits, k=10)))
                    arrangments.append(songDict)

    psarcData["key"] = os.path.splitext(os.path.basename(psarc))[0]
    psarcData["files"] = files
    psarcData["arrangements"] = arrangments

    print(json.dumps(psarcData, sort_keys=False))
    pass


def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "f:e:")
    except getopt.GetoptError as err:
        # print help information and exit:
        print(str(err))  # will print something like "option -a not recognized"
        sys.exit(2)

    file = ""
    extractFile = ""
    for o, a in opts:
        if o in ("-f"):
            file = a
        elif o in ("-e"):
            extractFile = a
    try:
        if file != "" and extractFile != "":
            extract_file(file, extractFile)
        else:
            read_psarc(file)
    except:
        type, value, tb = sys.exc_info()
        traceback.print_exc()
        print_error()


def print_error():
    data = {}
    data["error"] = True
    print(json.dumps(data, sort_keys=False))


if __name__ == "__main__":
    try:
        main()
    except:
        type, value, tb = sys.exc_info()
        traceback.print_exc()
        print_error()