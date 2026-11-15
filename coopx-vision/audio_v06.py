"""COOP X CINEMA v0.6: entirely original synthesized score and safer mastering.

No external music or video generation API is called. Works on CPU-only Render.
"""
from __future__ import annotations
import math
from pathlib import Path
import subprocess
import wave
import numpy as np

RATE=22050
BPM=120

def make_score(path:Path, seconds:float, intensity:str='epic') -> None:
    """A dark, original four-chord synth score with percussion and scene impacts."""
    size=int(seconds*RATE)
    audio=np.zeros(size,dtype=np.float32)
    rng=np.random.default_rng(2006)
    beat=60/BPM
    chords=[(82.407,123.471,164.814),(65.406,98.,130.813),
            (97.999,146.832,195.998),(73.416,110.,146.832)]
    def add(at,signal,gain):
        pos=int(at*RATE)
        if pos<0 or pos>=size:return
        n=min(len(signal),size-pos)
        audio[pos:pos+n]+=(signal[:n]*gain).astype(np.float32)
    for start in np.arange(0,seconds,4.):
        chord=chords[int(start//4)%len(chords)]
        duration=min(4.2,seconds-start)
        t=np.arange(int(duration*RATE),dtype=np.float32)/RATE
        pad=np.zeros_like(t)
        for hz in chord:
            pad+=.28*np.sin(2*np.pi*hz*t)+.07*np.sin(2*np.pi*hz*2*t)
        pad*=np.minimum(1,t/.6)*np.minimum(1,np.maximum(0,(duration-t)/.6))
        add(start,pad,.075)
    for step in range(math.ceil(seconds/beat)):
        start=step*beat
        section=start/max(seconds,.1)
        volume=.68+.37*section+(.15 if section>.7 else 0.)
        t=np.arange(int(.26*RATE),dtype=np.float32)/RATE
        kick=(np.sin(2*np.pi*(65*t+37*(1-np.exp(-30*t))/30))*np.exp(-19*t)
             +.11*rng.standard_normal(len(t)).astype(np.float32)*np.exp(-85*t))
        if step%4 in (0,2):add(start,kick,.66*volume)
        if step%4 in (1,3):
            t=np.arange(int(.19*RATE),dtype=np.float32)/RATE
            snare=(rng.standard_normal(len(t)).astype(np.float32)*np.exp(-20*t)
                   +.33*np.sin(2*np.pi*185*t)*np.exp(-22*t))
            add(start,snare,.19*volume)
        t=np.arange(int(.07*RATE),dtype=np.float32)/RATE
        hat=rng.standard_normal(len(t)).astype(np.float32)*np.exp(-67*t)
        add(start,hat,.046*volume)
        if step%2==0:
            t=np.arange(int(.42*RATE),dtype=np.float32)/RATE
            hz=chords[(step//8)%len(chords)][0]
            bass=(np.sin(2*np.pi*hz*t)+.23*np.sin(2*np.pi*hz*2*t))*np.exp(-5*t)
            add(start,bass,.23*volume)
        if intensity=='epic' and step%2==1:
            hz=chords[(step//8)%len(chords)][(step//2)%3]*2
            t=np.arange(int(.23*RATE),dtype=np.float32)/RATE
            lead=(np.sin(2*np.pi*hz*t)+.20*np.sin(2*np.pi*hz*2*t))*np.exp(-9*t)
            add(start,lead,.035*(.7+section))
    for start in np.arange(7.5,seconds,7.5):
        t=np.arange(int(.50*RATE),dtype=np.float32)/RATE
        add(start,np.sin(2*np.pi*(80*t-35*t*t))*np.exp(-10*t),.23)
    audio=np.tanh(audio*1.9)
    n=min(int(.85*RATE),size//3)
    if n:
        audio[:n]*=np.linspace(0,1,n,dtype=np.float32)
        audio[-n:]*=np.linspace(1,0,n,dtype=np.float32)
    pcm=np.asarray(np.clip(audio*30500,-32768,32767),dtype='<i2')
    with wave.open(str(path),'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(pcm.tobytes())

def master(input_mp4:Path,output_mp4:Path,work:Path,seconds:int,
           soundtrack:bool,music_level:int=80,score_style:str='epic')->None:
    """Mix game and music; measured test is ~-16 LUFS / < -1.5 dBTP."""
    command=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
             '-i',str(input_mp4)]
    if soundtrack:
        score=work/'original_score_v06.wav'
        make_score(score,seconds,score_style)
        command+=['-i',str(score)]
        music_gain=.85+1.20*(music_level/100.)
        game_gain=.62-.22*(music_level/100.)
        audio_filter=(f'[0:a]aresample=44100,volume={game_gain:.3f}[game];'
                      f'[1:a]aresample=44100,highpass=f=40,lowpass=f=16000,'
                      f'acompressor=threshold=-17dB:ratio=2.2:attack=9:release=160,'
                      f'volume={music_gain:.3f}[score];'
                      '[game][score]amix=inputs=2:duration=first:normalize=0,'
                      'loudnorm=I=-14:TP=-5:LRA=8,'
                      'alimiter=limit=0.72:level=0[a]')
    else:
        audio_filter=('[0:a]aresample=44100,loudnorm=I=-14:TP=-5:LRA=8,'
                      'alimiter=limit=0.72:level=0[a]')
    command+=['-filter_complex',audio_filter,'-map','0:v:0','-map','[a]',
              '-c:v','copy','-c:a','aac','-b:a','160k','-ar','44100','-ac','2',
              '-t',str(seconds),'-movflags','+faststart',str(output_mp4)]
    result=subprocess.run(command,capture_output=True,text=True,timeout=120)
    if result.returncode or not output_mp4.exists() or output_mp4.stat().st_size<100000:
        raise RuntimeError('Échec du mixage audio : '+(result.stderr or '')[-440:])
