"""CPU-only smart montage helpers for COOP X CINEMA v0.5.

Scores tiny samples of a Twitch VOD using motion and OCR menu detection,
creates real video crossfades, and synthesizes an ORIGINAL, royalty-free beat.
No neural model or GPU is involved; results are approximate.
"""
from __future__ import annotations
import math
from pathlib import Path
import random
import re
import shutil
import subprocess
import wave
import unicodedata

import cv2
import numpy as np
import pytesseract

FPS=24
TRANSITION=0.5
MENU_MARKERS=(
    'MENU PRINCIPAL','MAIN MENU','OPTIONS','PARAMETRES','SETTINGS',
    'INVENTAIRE','INVENTORY','EQUIPEMENT','EQUIPMENT','LOADOUT',
    'PERSONNALISER','CUSTOMIZE','PAUSE','COMMANDES','CONTROLS',
    'RETOUR AU MENU','QUITTER LA PARTIE','SELECT CHAPTER',
    'CHAPITRES','CHAPTER SELECT','STOCKAGE','BOUTIQUE',
    'AMELIORATIONS','UPGRADES','AMELIORER','SELECT WEAPON',
    'CHOISIR UNE ARME','COMPETENCES','SKILL TREE','ARBRE DE COMPETENCE',
    'ARSENAL','CUSTOMIZATION','PAUSED','REPRENDRE','RESUME GAME',
)

def run_command(args, timeout=100):
    process=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                           timeout=timeout,check=False)
    if process.returncode:
        raise RuntimeError((process.stderr.decode('utf8','replace') or
            'FFmpeg a échoué')[-600:].replace('\n',' ')[:470])
    return process.stdout

def sample_score(playlist:str, offset:float) -> float|None:
    """Probe only ~1.5 seconds of 320x180 gray frames, with a hard timeout."""
    args=['ffmpeg','-nostdin','-hide_banner','-loglevel','error',
          '-ss',f'{offset:.2f}','-i',playlist,'-t','1.6',
          '-vf','fps=2,scale=320:180:force_original_aspect_ratio=decrease,'
                 'pad=320:180:(ow-iw)/2:(oh-ih)/2,format=gray',
          '-frames:v','3','-pix_fmt','gray','-f','rawvideo','pipe:1']
    try:
        data=run_command(args,timeout=27)
        frame_size=320*180
        count=min(3,len(data)//frame_size)
        if count<2:
            return None
        frames=np.frombuffer(data[:count*frame_size],np.uint8).reshape(count,180,320)
        motion=float(np.abs(frames[1:].astype(np.float32)-
                            frames[:-1].astype(np.float32)).mean())
        gray=frames[count//2]
        contrast=float(gray.std())
        brightness=float(gray.mean())
        edges=cv2.Canny(gray,60,140)
        detail=float((edges>0).mean()*100)
        result=1.65*motion + .20*contrast + .40*detail
        if brightness<16 or contrast<12:
            result-=45
        # Penalize menus and inventory screens, not ordinary HUD prompts.
        try:
            text=pytesseract.image_to_string(gray,lang='eng+fra',
                      config='--psm 11',timeout=3).upper()
        except Exception:
            text=''
        # OCR sometimes sees accents; match normalized French/English UI words.
        normalized=''.join(ch for ch in unicodedata.normalize('NFD',text)
                           if not unicodedata.combining(ch))
        if any(marker in normalized for marker in MENU_MARKERS):
            result-=110
        # Text-heavy static interfaces are a weak menu signal.
        if len(text)>190 and motion<13:
            result-=23
        return round(result,2)
    except Exception:
        return None

def select_scenes(playlist:str,duration:float,target_seconds:int, progress):
    """Spread highlights throughout the VOD and rank two choices in each region."""
    count=int(target_seconds//7.5)
    clip_lengths=[8.0]*count
    clip_lengths[-1]=7.5
    # The original file can be much longer than the output, so scan sparse regions.
    accessible=max(30.,duration-20.)
    spacing=accessible/count
    scenes=[]
    scored=0
    comparisons=0
    for i,length in enumerate(clip_lengths):
        region_start=10.+i*spacing
        room=max(0.,min(spacing-length,duration-length-5-region_start))
        positions=(.09,.50,.87) if count<=8 else (.18,.78)
        candidates=[round(region_start+room*f,2) for f in positions]
        best=None
        for j,start in enumerate(sorted(set(candidates))):
            # Measure activity in the middle of each clip.
            score=sample_score(playlist,min(duration-2.,start+max(1.,length/2-1)))
            scored+=score is not None
            comparisons+=1
            if score is not None and (best is None or score>best[1]):
                best=(start,score)
            progress(comparisons,(3 if count<=8 else 2)*count)
        if best is None:
            scenes.append({'offset':round(min(duration-length-3,
                         region_start+room*.4),2),
                         'seconds':length,'score':None})
        else:
            scenes.append({'offset':best[0],'seconds':length,'score':best[1]})
    return scenes, {'sampled':comparisons,'valid_samples':scored,
                     'selection': 'smart' if scored else 'fallback'}

def make_original_beat(path:Path,seconds:float,seed:int=7,bpm:int=120):
    """Procedural industrial kick/snare/hat + 4-bar minor bass; no external songs."""
    rate=22050
    n=int(seconds*rate)
    audio=np.zeros(n,dtype=np.float32)
    rng=np.random.default_rng(seed)
    beat_seconds=60/bpm
    def add(start,signal):
        pos=int(start*rate)
        if pos>=n:return
        length=min(len(signal),n-pos)
        if length>0:audio[pos:pos+length]+=signal[:length]
    for step in range(math.ceil(seconds/beat_seconds)):
        begin=step*beat_seconds
        tk=np.arange(int(rate*.24),dtype=np.float32)/rate
        if step%4 in (0,2):
            kick=np.sin(2*np.pi*(58*tk+85*tk*tk*.5))*np.exp(-19*tk)
            add(begin,.32*kick)
        if step%4 in (1,3):
            ts=np.arange(int(rate*.16),dtype=np.float32)/rate
            noise=rng.standard_normal(len(ts)).astype(np.float32)
            add(begin,.15*noise*np.exp(-24*ts))
        th=np.arange(int(rate*.07),dtype=np.float32)/rate
        hat=rng.standard_normal(len(th)).astype(np.float32)
        add(begin,.048*hat*np.exp(-75*th))
        if step%2==0:
            # E minor / C / G / D root sequence, subtle behind gameplay.
            notes=[82.407,65.406,97.999,73.416]
            note=notes[(step//8)%len(notes)]
            tb=np.arange(int(rate*.40),dtype=np.float32)/rate
            bass=np.sin(2*np.pi*note*tb)+.18*np.sin(4*np.pi*note*tb)
            add(begin,.075*bass*np.exp(-4*tb))
    # Soft limiting and global fade.
    audio=np.tanh(audio*1.3)
    fi=min(n,int(rate*.9))
    audio[:fi]*=np.linspace(0,1,fi,dtype=np.float32)
    audio[-fi:]*=np.linspace(1,0,fi,dtype=np.float32)
    pcm=np.asarray(np.clip(audio*28000,-32768,32767),dtype='<i2')
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(pcm.tobytes())

def transcode_original(playlist,offset,length,dest:Path,
                       width:int,height:int,style:str,index:int,has_audio:bool=True):
    # Clean footage; every 0.5s is a keyframe for accurate trims.
    look=('eq=contrast=1.11:saturation=1.16:brightness=-0.012'
          if style=='cinema' else
          'eq=contrast=1.09:saturation=1.25:brightness=0.008')
    # Gentle motion zoom over the shot; fast zooms distract from gameplay.
    # Alternate push-ins and pull-backs so edits are not visually identical.
    zoom_curve=("min(1.035+on*0.00048,1.12)" if index%3==0
                else "max(1.10-on*0.00040,1.018)" if index%3==1
                else "min(1.012+on*0.00028,1.085)")
    zoom=(f"zoompan=z='{zoom_curve}':"
          "x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:"
          f"s={width}x{height}:fps={FPS}")
    grading=("vignette=PI/5,unsharp=3:3:0.35" if style=='cinema'
             else "unsharp=3:3:0.45")
    vf=(f'scale={width}:{height}:force_original_aspect_ratio=increase,'
        f'crop={width}:{height},fps={FPS},'
        f'{zoom},{look},{grading},format=yuv420p')
    args=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
          '-ss',f'{offset:.2f}','-i',playlist,'-t',f'{length:.2f}',
          '-vf',vf,'-c:v','libx264','-preset','ultrafast','-crf','27',
          '-g','12','-keyint_min','12','-sc_threshold','0',
          '-pix_fmt','yuv420p','-r','24',
          '-c:a','aac','-b:a','96k','-ar','44100','-ac','2',
          '-movflags','+faststart',str(dest)]
    # Source missing audio: retry with generated silent track.
    try:
        if not has_audio:
            raise RuntimeError('Audio Twitch absent : générer une piste silencieuse')
        run_command(args,timeout=160)
    except Exception:
        args=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
              '-ss',f'{offset:.2f}','-i',playlist,
              '-f','lavfi','-t',f'{length:.2f}','-i',
              'anullsrc=r=44100:cl=stereo','-t',f'{length:.2f}',
              '-filter_complex',f'[0:v]{vf}[v]',
              '-map','[v]','-map','1:a:0',
              '-c:v','libx264','-preset','ultrafast','-crf','27',
              '-g','12','-sc_threshold','0','-c:a','aac',
              '-b:a','96k','-ar','44100','-ac','2','-shortest',str(dest)]
        run_command(args,timeout=160)
    if not dest.exists() or dest.stat().st_size<10000:
        raise RuntimeError('Extraction vidéo incomplète.')

def crossfade_pairs(parts:list[Path],work:Path,output:Path,
                    target_seconds:int,enable_music:bool,progress,
                    fx_style:str='intense'):
    """True 0.5s per-boundary crossfade via FFmpeg blend and audio acrossfade.

    Only two short clips are decoded at once to fit Render Free RAM.
    """
    ordered=[]
    for idx,part in enumerate(parts):
        # Clip length is 8 sec, except last 7.5 sec.
        length=8. if idx<len(parts)-1 else 7.5
        core=work/f'body-{idx:02d}.mp4'
        crop_from=0. if idx==0 else TRANSITION
        crop_to=length if idx==len(parts)-1 else length-TRANSITION
        run_command(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
            '-ss',f'{crop_from:.3f}','-i',str(part),'-t',f'{crop_to-crop_from:.3f}',
            '-c','copy','-avoid_negative_ts','make_zero',str(core)],timeout=30)
        ordered.append(core)
        progress(idx,'body')
        if idx==len(parts)-1:continue
        right=parts[idx+1]
        fade=work/f'fade-{idx:02d}.mp4'
        # Alternate gentle flash, chromatic glitch, and motion blur effects.
        # The 'subtle' option uses plain crossfades without flashes.
        if fx_style=='subtle':
            transition_effect='format=yuv420p'
        elif fx_style=='extreme' and idx%3==0:
            transition_effect=("eq=contrast=1.45:saturation=1.45:brightness=0.22:"
                               "enable='between(t,0.14,0.28)',format=yuv420p")
        elif fx_style=='extreme' and idx%3==1:
            transition_effect=("chromashift=cbh=11:crh=-11:edge=smear:"
                               "enable='between(t,0.04,0.36)',"
                               "eq=brightness=0.08:enable='between(t,0.17,0.23)',"
                               "format=yuv420p")
        elif fx_style=='extreme':
            transition_effect=("gblur=sigma=2.8:enable='between(t,0.11,0.29)',"
                               "eq=contrast=1.28:brightness=0.08:"
                               "enable='between(t,0.13,0.25)',format=yuv420p")
        elif idx%3==0:
            transition_effect=("eq=brightness=0.15:contrast=1.20:"
                               "enable='between(t,0.17,0.28)',format=yuv420p")
        elif idx%3==1:
            transition_effect=("chromashift=cbh=7:crh=-7:edge=smear:"
                               "enable='between(t,0.08,0.32)',format=yuv420p")
        else:
            transition_effect=("gblur=sigma=2:enable='between(t,0.13,0.29)',"
                               "format=yuv420p")
        filtergraph=(
          '[0:v]fps=24,setpts=PTS-STARTPTS,format=yuv420p[v0];'
          '[1:v]fps=24,setpts=PTS-STARTPTS,format=yuv420p[v1];'
          f"[v0][v1]blend=all_expr='A*(1-T/0.5)+B*T/0.5':shortest=1,{transition_effect}[v];"
          '[0:a]aresample=44100,asetpts=PTS-STARTPTS[a0];'
          '[1:a]aresample=44100,asetpts=PTS-STARTPTS[a1];'
          '[a0][a1]acrossfade=d=0.5[a]')
        run_command(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
            '-ss',f'{length-TRANSITION:.3f}','-t','0.5','-i',str(part),
            '-ss','0','-t','0.5','-i',str(right),
            '-filter_complex',filtergraph,
            '-map','[v]','-map','[a]',
            '-c:v','libx264','-preset','ultrafast','-crf','27',
            '-pix_fmt','yuv420p','-g','12','-c:a','aac','-b:a','96k',
            '-ar','44100','-ac','2','-movflags','+faststart',str(fade)],timeout=45)
        ordered.append(fade)
        progress(idx,'crossfade')
    text=work/'edit-list.txt'
    text.write_text(''.join(f"file '{f.name}'\n" for f in ordered),encoding='utf8')
    joined=work/'joined.mp4'
    run_command(['ffmpeg','-nostdin','-loglevel','error','-y',
                 '-f','concat','-safe','0','-i',str(text),
                 '-c','copy','-movflags','+faststart',
                 '-t',str(target_seconds),str(joined)],timeout=55)
    if enable_music:
        music=work/'original_beat.wav'
        make_original_beat(music,target_seconds,seed=29)
        graph=('[0:a]volume=0.97[game];'
               '[1:a]volume=0.25[beat];'
               '[game][beat]amix=inputs=2:duration=first:dropout_transition=0[a]')
        run_command(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
            '-i',str(joined),'-i',str(music),'-filter_complex',graph,
            '-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac',
            '-b:a','128k','-ar','44100','-ac','2','-t',str(target_seconds),
            '-movflags','+faststart',str(output)],timeout=95)
    else:
        shutil.copyfile(joined,output)
