"""Smoke tests for COOP X v0.7 without Twitch credentials or GPU."""
from pathlib import Path
import json
import os
import subprocess
import tempfile
import wave
import sys

BASE=Path(__file__).resolve().parent
sys.path.insert(0,str(BASE))
os.environ.setdefault('COOPX_ACCESS_TOKEN','test-token-longer-than-24-characters')
from cinema import vod_id, MontageRequest
from smart_editor import crossfade_pairs
from audio_v07 import make_score, master

assert vod_id('https://www.twitch.tv/c1truc2ouf/v/2929589941?sr=a')=='2929589941'
assert vod_id('https://www.twitch.tv/videos/2929589941')=='2929589941'
req=MontageRequest(vod_url='https://www.twitch.tv/videos/2929589941',
                   music_level=85,fx_style='extreme',edit_mode='trailer')
assert req.music_level==85

def cmd(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=160)
    if p.returncode:
        raise RuntimeError('FFmpeg failed: '+p.stderr[-800:])
    return p.stdout

with tempfile.TemporaryDirectory() as d:
    work=Path(d)
    tone=work/'music.wav'
    make_score(tone,15,'epic')
    with wave.open(str(tone),'rb') as s:
        assert s.getnchannels()==1
        assert s.getnframes()>200000
    # Known self-generated test footage, not a copyrighted gameplay file.
    parts=[]
    for i,seconds in enumerate((8,7.5)):
        dest=work/f'clip-{i:02d}.mp4'
        args=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi',
              '-i',f'testsrc2=size=320x180:rate=24:duration={seconds}',
              '-f','lavfi','-i',f'sine=frequency={330+i*220}:sample_rate=44100:duration={seconds}',
              '-t',str(seconds),'-c:v','libx264','-preset','ultrafast',
              '-pix_fmt','yuv420p','-g','12','-c:a','aac','-b:a','96k',str(dest)]
        cmd(args)
        parts.append(dest)
    joined=work/'timeline.mp4'
    crossfade_pairs(parts,work,joined,15,False,lambda *args:None,fx_style='extreme')
    assert joined.exists() and joined.stat().st_size>100000
    final=work/'out.mp4'
    master(joined,final,work,15,True,85,'epic')
    assert final.exists() and final.stat().st_size>100000
    probe=json.loads(cmd(['ffprobe','-v','error','-show_entries',
             'format=duration:stream=codec_type','-of','json',str(final)]))
    duration=float(probe['format']['duration'])
    assert 13.0<duration<=15.5,duration
    assert {'video','audio'}.issubset({s['codec_type'] for s in probe['streams']})
    # Measure integrated loudness. CI accepts a range due to fixture characteristics.
    p=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(final),
          '-af','ebur128=peak=true','-f','null','-'],
          stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=60)
    assert p.returncode==0,p.stderr[-600:]
    import re
    values=re.findall(r'I:\s*(-?\d+(?:\.\d+)?) LUFS',p.stderr)
    assert values, p.stderr[-500:]
    loudness=float(values[-1])
    print('COOP X SMOKE PASS:',json.dumps({'duration':duration,'LUFS':loudness}))
    assert -19<loudness<-10,loudness
