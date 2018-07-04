from itertools import takewhile


class BitReader:
    def __init__(self, stream):
        self.stream = stream
        self.pos = -1

    def read_bit(self):
        if self.pos == -1:
            self.buffer = ord(self.stream.read(1))
            self.pos = 7

        value = (self.buffer >> self.pos) & 0x01
        self.pos -= 1
        return value > 0

    def read_int(self, n, reverse=False):
        x = 0
        for i in reversed(range(n)) if reverse else range(n):
            x += self.read_bit() << i
        return x


def parse_BCFZ(file):
    header = file.read(4)
    assert header == b'BCFZ'

    length = int.from_bytes(file.read(4), 'little')

    br = BitReader(file)
    buffer = []

    while len(buffer) < length:
        compressed = br.read_bit()
        if compressed:
            word_size = br.read_int(4, reverse=True)
            offset = br.read_int(word_size)
            size = br.read_int(word_size)
            pos = len(buffer)-offset
            buffer += buffer[pos: pos + size]
        else:
            size = br.read_int(2)
            for _ in range(size):
                buffer.append(br.read_int(8, reverse=True))

    return bytes(buffer)


def read_BCFS(data):
    assert data[:4] == b'BCFS'
    data = data[4:]

    def int_at(pos):
        return int.from_bytes(data[pos:pos + 4], 'little', signed=True)

    def str_at(pos):
        return bytes(takewhile(lambda x: x != 0, data[pos:])).decode()

    fs = {}
    offset = 0
    SECTOR_SIZE = 4096
    while offset + SECTOR_SIZE < len(data):
        type_ = int_at(offset)
        name = str_at(offset + 4)
        size = int_at(offset + 140)

        if type_ == 2:
            content = b''
            sector_ptr = offset + 148
            while True:
                sector = int_at(sector_ptr)
                if not sector:
                    break
                offset = sector * SECTOR_SIZE
                content += data[offset: offset + SECTOR_SIZE]
                sector_ptr += 4
            fs[name] = content[:size]

        offset += SECTOR_SIZE

    return fs
