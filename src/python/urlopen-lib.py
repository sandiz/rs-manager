import json, struct, zlib, getopt, math, sys, traceback, os, time, random, string
import urllib.parse, urllib.request


def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "u:")
    except getopt.GetoptError as err:
        # print help information and exit:
        print(str(err))  # will print something like "option -a not recognized"
        sys.exit(2)

    url = ""
    for o, a in opts:
        if o in ("-u"):
            url = a

    decodedurl = urllib.parse.unquote(url)
    rsp = urllib.request.urlopen(decodedurl)
    print(str(rsp.read(), 'utf-8'))


if __name__ == "__main__":
    try:
        main()
    except:
        type, value, tb = sys.exc_info()
        traceback.print_exc()