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
    match=re.search(r'(?:^|/)videos/(\d{5,20})(?:/|$)',parsed.path)
    if not match:
        raise ValueError('Lien attendu : https://www.twitch.tv/videos/123456789')
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
    global BUSY
    work=ROOT/job_id
    work.mkdir(exist_ok=True)
    try:
        update(job_id,status='connecting',detail='Recherche de la rediffusion Twitch',progress=4)
        playlist,duration,has_audio=get_source(video_id)
        clips=choose_clips(int(duration),req.target_seconds)
        width,height=(960,540) if req.orientation=='landscape' else (540,960)
        update(job_id,status='processing',detail='Découpage de la partie',progress=10,
               vod_duration=round(duration),clips=[{'offset':start,'seconds':length} for start,length in clips])
        parts=[]
        for idx,(start,length) in enumerate(clips):
            segment=work/f'clip-{idx:02d}.mp4'
            fade_out=max(0.,length-.25)
            if req.style=='cinema':
                look='eq=contrast=1.09:saturation=1.12:brightness=-0.015'
            else:
                look='eq=contrast=1.07:saturation=1.28:brightness=0.01'
            vf=(f'scale={width}:{height}:force_original_aspect_ratio=increase,'
                f'crop={width}:{height},fps=24,{look},'
                f'fade=t=in:st=0:d=0.18,fade=t=out:st={fade_out:.2f}:d=0.25,'
                f'format=yuv420p')
            cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
                 '-ss',f'{start:.2f}','-i',playlist,'-t',f'{length:.2f}']
            if has_audio:
                cmd+=['-filter_complex',
                      f'[0:v:0]{vf}[v];[0:a:0]aresample=44100,'
                      f'afade=t=in:st=0:d=0.15,afade=t=out:st={fade_out:.2f}:d=0.2[a]',
                      '-map','[v]','-map','[a]']
            else:
                cmd+=['-f','lavfi','-i','anullsrc=r=44100:cl=stereo',
                      '-filter_complex',f'[0:v:0]{vf}[v]',
                      '-map','[v]','-map','1:a:0']
            cmd+=['-c:v','libx264','-preset','ultrafast','-crf','27',
                  '-pix_fmt','yuv420p','-r','24',
                  '-c:a','aac','-b:a','96k','-ar','44100','-ac','2',
                  '-movflags','+faststart','-shortest',str(segment)]
            run(cmd,timeout=105)
            if not segment.exists() or segment.stat().st_size<10240:
                raise RuntimeError('Extraction vidéo incomplète pour un extrait.')
            parts.append(segment)
            update(job_id,progress=round(10+78*(idx+1)/len(clips)),
                   detail=f'Extrait {idx+1}/{len(clips)} encodé')
        listing=work/'concat.txt'
        listing.write_text(''.join(f"file '{p.name}'\n" for p in parts),encoding='utf-8')
        out=work/'COOP_X_CINEMA.mp4'
        update(job_id,detail='Assemblage final MP4',progress=92)
        run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
             '-f','concat','-safe','0','-i',str(listing),'-c','copy',
             '-movflags','+faststart',str(out)],timeout=100)
        if not out.exists() or out.stat().st_size<100000:
            raise RuntimeError('Vidéo finale vide.')
        update(job_id,status='ready',progress=100,
               detail='Montage terminé',size_bytes=out.stat().st_size)
    except Exception as e:
        update(job_id,status='failed',detail=str(e)[:460],progress=0)
    finally:
        with lock:BUSY=False
        # Delete intermediary video files, retain only resulting MP4 while valid.
        for f in work.glob('clip-*.mp4'):
            try:f.unlink()
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
