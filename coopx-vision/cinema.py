"""Experimental automatic montage from the user's own public Twitch VOD.

Runs one bounded FFmpeg job on Render's ephemeral storage.
No user-uploaded footage is permanently retained.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import json
import math
import os
from pathlib import Path
import random
import re
import secrets
import shutil
import subprocess
import threading
import time
from urllib.parse import urlparse
import uuid

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from smart_editor import select_scenes, transcode_original, crossfade_pairs

ROOT=Path('/tmp/coopx-cinema')
ROOT.mkdir(exist_ok=True)
CHANNEL=os.getenv('TWITCH_CHANNEL','c1truc2ouf').strip().lower()
TOKEN=os.getenv('COOPX_ACCESS_TOKEN','')
router=APIRouter()
lock=threading.RLock()
jobs={}
BUSY=False
TTL=45*60

class MontageRequest(BaseModel):
    vod_url:str=Field(min_length=8,max_length=250)
    target_seconds:int=Field(default=90,ge=60,le=120)
    orientation:str=Field(default='landscape',pattern='^(landscape|portrait)$')
    style:str=Field(default='cinema',pattern='^(cinema|arcade)$')
    smart:bool=True
    soundtrack:bool=True

def verify(token:str|None):
    if not token or not secrets.compare_digest(token,TOKEN):
        raise HTTPException(401,'Code COOP X invalide')

def vod_id(value:str)->str:
    value=value.strip()
    if re.fullmatch(r'\d{5,20}',value):
        return value
    parsed=urlparse(value)
    if parsed.scheme!='https' or parsed.hostname not in ('twitch.tv','www.twitch.tv','m.twitch.tv'):
        raise ValueError('Donne le lien HTTPS d’une rediffusion Twitch.')
    match=re.search(r'(?:^|/)(?:videos|v)/(\d{5,20})(?:/|$)',parsed.path)
    if not match:
        raise ValueError('Lien Twitch attendu : /videos/123456789 ou /c1truc2ouf/v/123456789')
    return match.group(1)

def run(args:list[str],timeout:int=60)->str:
    process=subprocess.run(args,capture_output=True,text=True,timeout=timeout,check=False)
    if process.returncode!=0:
        raise RuntimeError((process.stderr or process.stdout or 'Commande vidéo échouée')[-500:].replace('\n',' ')[:450])
    return process.stdout.strip()

def get_source(video_id:str):
    vod='https://www.twitch.tv/videos/'+video_id
    playlist=run(['streamlink','--stream-url',vod,'best'],timeout=35).splitlines()[-1].strip()
    if not playlist.startswith('https://'):
        raise RuntimeError('Twitch ne fournit pas de flux HLS pour cette rediffusion.')
    info=json.loads(run([
        'ffprobe','-v','error','-show_entries','format=duration:stream=codec_type',
        '-of','json',playlist],timeout=45))
    duration=float(info.get('format',{}).get('duration') or 0)
    if not 120<=duration<=8*3600:
        raise RuntimeError('Impossible de connaître la durée de la rediffusion, ou rediffusion trop courte.')
    has_audio=any(s.get('codec_type')=='audio' for s in info.get('streams',[]))
    return playlist,duration,has_audio

def choose_clips(duration:int,target:int)->list[tuple[float,float]]:
    rng=random.Random()
    count=max(8,min(18,round(target/7.5)))
    base=target/count
    lengths=[max(5.,min(10.,base + rng.uniform(-1.,1.))) for _ in range(count)]
    factor=target/sum(lengths)
    lengths=[max(5.,min(10.,x*factor)) for x in lengths]
    # Cover the entire broadcast with a little jitter; don't repeat adjacent passages.
    region=(duration-20)/count
    result=[]
    for idx,length in enumerate(lengths):
        lo=10+idx*region
        hi=min(duration-length-5,lo+max(0,region-length))
        start=lo if hi<=lo else rng.uniform(lo,hi)
        result.append((round(start,1),round(length,1)))
    return result

def update(job_id,**fields):
    with lock:
        if job_id in jobs:
            jobs[job_id].update(fields)
            jobs[job_id]['updated_at']=time.time()

def cleanup():
    now=time.time()
    with lock:
        old=[key for key,val in jobs.items() if now-val['created_at']>TTL and val['status'] not in ('processing','connecting')]
        for key in old:
            jobs.pop(key,None)
            shutil.rmtree(ROOT/key,ignore_errors=True)

def produce(job_id:str,req:MontageRequest,video_id:str):
    """Single bounded CPU render; status remains queryable by Android."""
    global BUSY
    work=ROOT/job_id
    work.mkdir(exist_ok=True)
    try:
        update(job_id,status='connecting',detail='Ouverture de la rediffusion Twitch',progress=4)
        playlist,duration,has_audio=get_source(video_id)
        if req.smart:
            update(job_id,status='analyzing',detail='Recherche des meilleurs moments',progress=6)
            def on_scan(done,total):
                update(job_id,progress=6+round(14*done/total),
                       detail=f'Analyse des scènes {done}/{total}')
            scenes,report=select_scenes(playlist,duration,req.target_seconds,on_scan)
        else:
            # Reproducible balanced fallback; 8s clips + 0.5s transitions.
            n=int(req.target_seconds//7.5)
            scenes=[{'offset':round(10+i*(duration-20)/n,2),
                     'seconds':7.5 if i==n-1 else 8.0,'score':None}
                    for i in range(n)]
            report={'selection':'balanced','sampled':0,'valid_samples':0}
        update(job_id,status='processing',detail='Séquences sélectionnées, début du rendu',
               progress=22,vod_duration=round(duration),analysis=report,
               clips=scenes,has_game_audio=has_audio)
        width,height=(960,540) if req.orientation=='landscape' else (540,960)
        parts=[]
        for idx,scene in enumerate(scenes):
            segment=work/f'clip-{idx:02d}.mp4'
            transcode_original(playlist,scene['offset'],scene['seconds'],segment,
                               width,height,req.style,idx,has_audio=has_audio)
            parts.append(segment)
            update(job_id,progress=round(23+52*(idx+1)/len(scenes)),
                   detail=f'Séquence {idx+1}/{len(scenes)} encodée')
        output=work/'COOP_X_CINEMA.mp4'
        update(job_id,progress=76,detail='Transitions cinématographiques en cours')
        def on_merge(index,stage):
            fraction=(index+1)/len(parts)
            update(job_id,progress=round(76+17*fraction),
                   detail=('Transitions fondues et mixage audio' if stage=='crossfade'
                           else 'Assemblage de la timeline'))
        crossfade_pairs(parts,work,output,req.target_seconds,req.soundtrack,on_merge)
        if not output.exists() or output.stat().st_size<100000:
            raise RuntimeError('La vidéo finale est vide.')
        update(job_id,status='ready',progress=100,detail='Montage terminé',
               size_bytes=output.stat().st_size,
               music='Rythme original 120 BPM' if req.soundtrack else 'Audio du jeu uniquement',
               transitions='Fondus réels de 0,5 seconde')
    except Exception as e:
        update(job_id,status='failed',detail=str(e)[:460],progress=0)
    finally:
        with lock:BUSY=False
        # Keep only the MP4 of a successful job. Ephemeral storage, auto-expires.
        for extra in work.iterdir():
            if extra.name!='COOP_X_CINEMA.mp4':
                try:
                    if extra.is_dir():shutil.rmtree(extra,ignore_errors=True)
                    else:extra.unlink()
                except Exception:pass

@router.get('/cinema',response_class=HTMLResponse)
def cinema_page():
    page=Path(__file__).with_name('cinema.html')
    return HTMLResponse(page.read_text(encoding='utf-8'))

@router.post('/api/cinema/jobs')
def create_job(req:MontageRequest,x_coopx_token:str|None=Header(default=None)):
    global BUSY
    verify(x_coopx_token)
    try:vid=vod_id(req.vod_url)
    except ValueError as e:raise HTTPException(422,str(e))
    cleanup()
    with lock:
        if BUSY:raise HTTPException(429,'Un montage est déjà en cours. Réessaie après sa fin.')
        BUSY=True
        job_id=uuid.uuid4().hex
        jobs[job_id]={'id':job_id,'status':'queued','progress':0,
                      'detail':'Préparation du montage','created_at':time.time(),
                      'updated_at':time.time(),'vod_id':vid,
                      'channel':CHANNEL,'duration_requested':req.target_seconds}
    threading.Thread(target=produce,args=(job_id,req,vid),daemon=True).start()
    return {'job_id':job_id,'status':'queued'}

@router.get('/api/cinema/jobs/{job_id}')
def job_status(job_id:str,x_coopx_token:str|None=Header(default=None)):
    verify(x_coopx_token)
    cleanup()
    with lock:
        job=jobs.get(job_id)
        if not job:raise HTTPException(404,'Montage introuvable ou expiré.')
        return dict(job)

@router.get('/api/cinema/jobs/{job_id}/download')
def download(job_id:str,x_coopx_token:str|None=Header(default=None)):
    verify(x_coopx_token)
    cleanup()
    with lock:job=jobs.get(job_id)
    if not job or job.get('status')!='ready':raise HTTPException(404,'Vidéo non disponible.')
    path=ROOT/job_id/'COOP_X_CINEMA.mp4'
    if not path.exists():raise HTTPException(404,'Vidéo expirée.')
    return FileResponse(path,media_type='video/mp4',filename=f'COOP_X_CINEMA_{CHANNEL}.mp4')
