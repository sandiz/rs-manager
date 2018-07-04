import os
import json

from rocksmith import PSARC, SNG


def path2dict(path):
    n = len(path) + 1
    d = {}
    for dirpath, _, filenames in os.walk(path):
        for filename in filenames:
            fullpath = os.path.join(dirpath, filename)
            with open(fullpath, 'rb') as fh:
                d[fullpath[n:]] = fh.read()
    return d


def dict2path(d, dest='.'):
    for filepath, data in d.items():
        filename = os.path.join(dest, filepath)
        path = os.path.dirname(filename)
        if not os.path.exists(path):
            os.makedirs(path)
        with open(filename, 'wb') as fh:
            fh.write(data)


def unpack(filename, crypto):
    with open(filename, 'rb') as fh:
        content = PSARC(crypto).parse_stream(fh)
    destdir = os.path.splitext(os.path.basename(filename))[0]
    dict2path(content, destdir)


def pack(directory, crypto):
    content = path2dict(directory)
    dest = os.path.basename(directory) + '.psarc'
    with open(dest, 'wb') as fh:
        PSARC(crypto).build_stream(content, fh)


def print_sng(filename):
    with open(filename, 'rb') as fh:
        sng = SNG.parse_stream(fh)
        print(json.dumps(sng, indent=4))


def _convert(data, mac2pc):
    if mac2pc:
        data = data.replace('audio/mac', 'audio/windows')
        data = data.replace('bin/macos', 'bin/generic')
    else:
        data = data.replace('audio/windows', 'audio/mac')
        data = data.replace('bin/generic', 'bin/macos')
    return data


def convert(filename):
    if filename.endswith('_m.psarc'):
        outname = filename.replace('_m.psarc', '_p.psarc')
        mac2pc = True
    elif filename.endswith('_p.psarc'):
        outname = filename.replace('_p.psarc', '_m.psarc')
        mac2pc = False
    else:
        print('Can only convert between MAC and PC!')
        return

    with open(filename, 'rb') as fh:
        content = PSARC().parse_stream(fh)

    new_content = {}
    for path, data in content.items():
        if path.endswith('aggregategraph.nt'):
            data = _convert(data.decode(), mac2pc)
            if mac2pc:
                data = data.replace('macos', 'dx9').encode('ascii')
            else:
                data = data.replace('dx9', 'macos').encode('ascii')

        new_content[_convert(path, mac2pc)] = data

    with open(outname, 'wb') as fh:
        PSARC().build_stream(new_content, fh)
