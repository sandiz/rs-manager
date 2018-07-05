from subprocess import run, DEVNULL, STDOUT
from os.path import splitext


def generate_dds(image, verbose=False):
    redirect = {} if verbose else {'stdout': DEVNULL, 'stderr': STDOUT}
    for s in [64, 128, 256]:
        run(['convert', image, '-resize', '{}x{}'.format(s, s),
             splitext(image)[0]+'_{}.dds'.format(s)], **redirect)
