"""
Command line interface to the rocksmith python package.
"""


def main():
    import argparse
    from rocksmith.utils import pack, unpack, convert, print_sng
    from rocksmith.wwise import generate_banks
    from rocksmith.goplayalong import read_xml
    from rocksmith.gfxassets import generate_dds

    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--no-crypto',
                        help='do not perform encryption/decryption operations',
                        action='store_true')

    parser.add_argument('--unpack',
                        help='unpack a PSARC archive',
                        metavar=('FILE',))

    parser.add_argument('--pack',
                        help='pack a DIRECTORY into a PSARC archive',
                        metavar=('DIRECTORY',))

    parser.add_argument('--convert',
                        help='convert a PSARC archive between MAC and PC',
                        metavar=('FILE',))

    parser.add_argument('--print-sng',
                        help='print a Rocksmith sng file as a JSON string',
                        metavar=('FILE',))

    parser.add_argument('--wwise',
                        help='generate soundbanks from a music file',
                        metavar=('FILE',))

    parser.add_argument('--gpa',
                        help='parse GoPlayAlong xml file for synchronization',
                        metavar=('FILE',))

    parser.add_argument('--dds',
                        help='generate DirectDraw Surface textures',
                        metavar=('FILE',))

    args = parser.parse_args()
    if args.unpack:
        unpack(args.unpack, not args.no_crypto)
    if args.pack:
        pack(args.pack, not args.no_crypto)
    if args.convert:
        convert(args.convert)
    if args.print_sng:
        print_sng(args.print_sng)
    if args.wwise:
        generate_banks(args.wwise, verbose=True)
    if args.gpa:
        print(read_xml(args.gpa))
    if args.dds:
        generate_dds(args.dds, verbose=True)
