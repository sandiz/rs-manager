from os.path import join, dirname
from shutil import copytree
from subprocess import run, DEVNULL, STDOUT
from tempfile import TemporaryDirectory


TEMPLATE_TREE = join(dirname(__file__), 'data/Wwise')

WWISE_CLI = '/Applications/Audiokinetic/Wwise {version}/'
WWISE_CLI += 'Wwise.app/Contents/Tools/WwiseCLI.sh'

CMD = '"{exe}" "{project}" -GenerateSoundBanks -Platform Windows'

SKIP = 'aevalsrc=0:d={}[slug];[slug][0]concat=n=2:v=0:a=1[out]'


def _find_executable(hint):
    return WWISE_CLI.format(version='2016.1.3.5878')


def generate_banks(filepath, verbose=False, intro=10, offset=30):
    exe = _find_executable(None)
    redirect = {} if verbose else {'stdout': DEVNULL, 'stderr': STDOUT}

    with TemporaryDirectory() as tmp:
        base_dir = join(tmp, 'Wwise')
        copytree(TEMPLATE_TREE, base_dir)

        sfx_dir = join(base_dir, 'Originals', 'SFX')
        cmd = ['ffmpeg', '-i', filepath]
        run(cmd + ['-filter_complex', SKIP.format(intro), '-map', '[out]',
                   join(sfx_dir, 'song.wav')], **redirect)
        run(cmd + ['-ss', str(offset), '-t', '30',
                   join(sfx_dir, 'preview.wav')], **redirect)

        cmd = CMD.format(exe=exe, project=join(base_dir, 'Template.wproj'))
        run(cmd, shell=True, **redirect)

        bnk_dir = join(base_dir, 'GeneratedSoundBanks', 'Windows')
        copytree(bnk_dir, join('.', 'soundbanks'))
