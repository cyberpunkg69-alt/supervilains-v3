"""COOP X CINEMA v0.7 — original beat-synced cinematic music & mastering.

CPU-only NumPy score synthesis + FFmpeg loudness processing.
All sounds are procedural; no external music provider or paid API.
"""
from __future__ import annotations
from pathlib import Path
import math
import subprocess
import wave

import numpy as np

RATE=22050
BPM=120
BEAT=60/BPM
EDIT=7.5  # The render engine cuts every 15 beats at 120 BPM.

def make_score(path:Path, seconds:float, intensity:str='epic') -> None:
    if not 0<seconds<=125:
        raise ValueError('Durée musicale invalide.')
    size=int(seconds*RATE)
    audio=np.zeros(size,dtype=np.float32)
    rng=np.random.default_rng(2007)
    chords=[(82.407,123.471,164.814),
            (65.406,98.000,130.813),
            (97.999,146.832,195.998),
            (73.416,110.000,146.832)]

    def add(at, signal, gain):
        p=int(at*RATE)
        if p<0 or p>=size:
            return
        n=min(len(signal),size-p)
        if n:
            audio[p:p+n]+=(signal[:n]*gain).astype(np.float32)

    # Original chord progression, changing exactly on montage boundaries.
    for ix,start in enumerate(np.arange(0,seconds,EDIT)):
        length=min(EDIT+.25,seconds-start)
        t=np.arange(int(length*RATE),dtype=np.float32)/RATE
        chord=chords[ix%4]
        pad=np.zeros_like(t)
        for frequency in chord:
            pad+=(0.28*np.sin(2*np.pi*frequency*t)
                  +0.055*np.sin(2*np.pi*frequency*2.01*t))
        pad*=np.minimum(1,t/.42)*np.minimum(1,np.maximum(0,(length-t)/.52))
        add(float(start),pad,.16 if intensity=='epic' else .11)

    for step in range(math.ceil(seconds/BEAT)):
        start=step*BEAT
        position=start/seconds
        growth=.72+.38*position+(.12 if position>.72 else 0.)
        t=np.arange(int(.28*RATE),dtype=np.float32)/RATE
        kick=(np.sin(2*np.pi*(57*t+41*(1-np.exp(-23*t))/23))*np.exp(-17*t)
              +.10*rng.standard_normal(len(t)).astype(np.float32)*np.exp(-75*t))
        if step%4 in (0,2):
            add(start,kick,.80*growth)
        if step%4 in (1,3):
            sn_t=np.arange(int(.17*RATE),dtype=np.float32)/RATE
            sn=(rng.standard_normal(len(sn_t)).astype(np.float32)*np.exp(-22*sn_t)
                +.22*np.sin(2*np.pi*200*sn_t)*np.exp(-18*sn_t))
            add(start,sn,.25*growth)
        hat_t=np.arange(int(.07*RATE),dtype=np.float32)/RATE
        hat=rng.standard_normal(len(hat_t)).astype(np.float32)*np.exp(-65*hat_t)
        add(start,hat,.048*growth)
        if step%2==0:
            hz=chords[int(start//EDIT)%4][0]
            bt=np.arange(int(.41*RATE),dtype=np.float32)/RATE
            bass=(np.sin(2*np.pi*hz*bt)+.20*np.sin(2*np.pi*hz*2*bt))*np.exp(-4*bt)
            add(start,bass,.30*growth)
        if intensity=='epic' and step%2:
            hz=chords[int(start//EDIT)%4][(step//2)%3]*2.
            nt=np.arange(int(.22*RATE),dtype=np.float32)/RATE
            lead=(np.sin(2*np.pi*hz*nt)+.23*np.sin(2*np.pi*hz*2*nt))*np.exp(-8*nt)
            add(start,lead,.063*growth)

    # Rising noise + cinematic low hit exactly at scene edits.
    for edge in np.arange(EDIT,seconds,EDIT):
        rt=np.arange(int(.30*RATE),dtype=np.float32)/RATE
        rise=(rng.standard_normal(len(rt)).astype(np.float32)
              *np.linspace(.01,.28,len(rt),dtype=np.float32))
        add(float(edge)-.3,rise,.17)
        ht=np.arange(int(.6*RATE),dtype=np.float32)/RATE
        hit=(np.sin(2*np.pi*(76*ht-31*ht*ht))+.05*rng.standard_normal(len(ht)))
        add(float(edge),hit*np.exp(-11*ht),.47)

    # A slightly bigger final section, then a musical fade instead of an abrupt end.
    audio=np.tanh(audio*1.55)
    n=min(int(.7*RATE),size//4)
    if n:
        audio[:n]*=np.linspace(0,1,n,dtype=np.float32)
        audio[-n:]*=np.linspace(1,0,n,dtype=np.float32)
    pcm=np.asarray(np.clip(audio*29500,-32768,32767),dtype='<i2')
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm.tobytes())

def master(input_mp4:Path,output_mp4:Path,work:Path,seconds:int,
           soundtrack:bool,music_level:int=85,score_style:str='epic')->None:
    """Tunable original soundtrack + game sound, normalized near -14 LUFS.

    Final true-peak ceiling is handled by loudnorm (TP -1.5 dBFS).
    The music slider changes the music/game balance, not only final loudness.
    """
    level=max(0.,min(1.,music_level/100.))
    cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
         '-i',str(input_mp4)]
    if soundtrack:
        score=work/'coopx_original_score_v07.wav'
        make_score(score,seconds,score_style)
        cmd+=['-i',str(score)]
        music_gain=2.75*(level**1.2)
        game_gain=.70-.36*level
        graph=(f'[0:a]aresample=44100,highpass=f=50,volume={game_gain:.3f}[game];'
               f'[1:a]aresample=44100,highpass=f=32,lowpass=f=15500,'
               f'acompressor=threshold=-17dB:ratio=2.0:attack=8:release=160,'
               f'volume={music_gain:.3f}[music];'
               '[game][music]amix=inputs=2:duration=first:normalize=0,'
               'alimiter=limit=0.92:attack=5:release=80:level=0,'
               'loudnorm=I=-13.8:TP=-1.5:LRA=8:linear=false[a]')
    else:
        graph=('[0:a]aresample=44100,'
               'loudnorm=I=-13.8:TP=-1.5:LRA=8:linear=false[a]')
    cmd+=['-filter_complex',graph,'-map','0:v:0','-map','[a]',
          '-c:v','copy','-c:a','aac','-b:a','160k','-ar','44100','-ac','2',
          '-t',str(seconds),'-movflags','+faststart',str(output_mp4)]
    result=subprocess.run(cmd,capture_output=True,text=True,timeout=150,check=False)
    if result.returncode!=0 or not output_mp4.is_file() or output_mp4.stat().st_size<100000:
        raise RuntimeError('Mastering v0.7 impossible : '+result.stderr[-380:])
