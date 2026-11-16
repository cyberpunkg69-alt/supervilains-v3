"""COOP X LIVE Vision experimental one-channel monitor.
The server analyzes sampled video pixels from a public Twitch livestream.
It never logs in to Xbox or Twitch, and only exposes OCR behind a token.
"""
from __future__ import annotations
from collections import deque
from contextlib import asynccontextmanager
import logging
import os
import re
import secrets
import subprocess
import threading
import time
import cv2
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from detector import read_text, StableMatcher
from cinema import router as cinema_router

logging.basicConfig(level=logging.INFO)
log=logging.getLogger('coopx')
CHANNEL=os.getenv('TWITCH_CHANNEL','c1truc2ouf').strip().lower()
if not re.fullmatch(r'[a-z0-9_]{3,25}',CHANNEL):
    raise RuntimeError('TWITCH_CHANNEL invalide')
TOKEN=os.getenv('COOPX_ACCESS_TOKEN','')
if len(TOKEN)<24:
    raise RuntimeError('Définir un COOPX_ACCESS_TOKEN secret de 24+ caractères')
SECONDS=max(3,min(15,int(os.getenv('COOPX_SAMPLE_SECONDS','6'))))
ORIGINS=[s.strip() for s in os.getenv('COOPX_ALLOWED_ORIGINS','*').split(',') if s.strip()]
CLIENT_TTL=95

class SharedState:
    def __init__(self):
        self.lock=threading.RLock()
        self.running=True
        self.status='idle'
        self.last_client_at=0.
        self.last_frame_at=0.
        self.last_text=''
        self.last_error=''
        self.seq=0
        self.events=deque(maxlen=70)
        self.matcher=StableMatcher()
    def snapshot(self):
        with self.lock:
            return {'channel':CHANNEL,'status':self.status,
                    'last_frame_at':self.last_frame_at,
                    'last_text':self.last_text,
                    'last_error':self.last_error,'seq':self.seq,
                    'events':list(self.events)[-10:]}

state=SharedState()

def stop_process(process):
    if not process:return
    try:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=2)
    except Exception:
        try:process.kill()
        except Exception:pass

def jpeg_frames(pipe):
    buf=bytearray()
    while state.running:
        chunk=pipe.read(16384)
        if not chunk:return
        buf.extend(chunk)
        while True:
            begin=buf.find(b'\xff\xd8')
            if begin<0:
                if len(buf)>6_000_000:buf.clear()
                break
            if begin>0:del buf[:begin]
            end=buf.find(b'\xff\xd9',2)
            if end<0:
                if len(buf)>6_000_000:buf.clear()
                break
            raw=bytes(buf[:end+2])
            del buf[:end+2]
            frame=cv2.imdecode(np.frombuffer(raw,dtype=np.uint8),cv2.IMREAD_COLOR)
            if frame is not None:yield frame

def monitor():
    while state.running:
        with state.lock:
            wanted=time.time()-state.last_client_at<CLIENT_TTL
            if not wanted:state.status='idle'
        if not wanted:
            time.sleep(2)
            continue
        source=None
        ff=None
        watchdog_stop=threading.Event()
        started_at=time.time()
        try:
            with state.lock:
                state.status='connecting'
                state.last_error=''
            source=subprocess.Popen(
                ['streamlink','--stdout','--retry-open','2',
                 'https://www.twitch.tv/'+CHANNEL,'worst'],
                stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,bufsize=0)
            ff=subprocess.Popen(
                ['ffmpeg','-nostdin','-loglevel','error','-threads','1',
                 '-fflags','+genpts','-i','pipe:0',
                 '-vf',f'fps=1/{SECONDS},scale=960:-1','-q:v','5',
                 '-f','image2pipe','-vcodec','mjpeg','pipe:1'],
                stdin=source.stdout,stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,bufsize=0)
            source.stdout.close()
            def watchdog():
                while not watchdog_stop.wait(5):
                    with state.lock:
                        last_frame=state.last_frame_at
                        last_client=state.last_client_at
                    if (time.time()-last_client>CLIENT_TTL+10 or
                            time.time()-max(started_at,last_frame)>80):
                        stop_process(ff)
                        stop_process(source)
                        break
            threading.Thread(target=watchdog,daemon=True,name='coopx-watchdog').start()
            for frame in jpeg_frames(ff.stdout):
                now=time.time()
                try:detected=read_text(frame)
                except Exception as error:
                    log.warning('OCR failure: %s',error)
                    detected=''
                matches=state.matcher.update(detected,now)
                with state.lock:
                    state.status='analyzing'
                    state.last_frame_at=now
                    state.last_text=detected[:900]
                    for hit in matches:
                        state.seq+=1
                        state.events.append({
                            'id':state.seq,'kind':hit.kind,'label':hit.label,
                            'detected_text':hit.detected_text,'timestamp':hit.timestamp})
                with state.lock:
                    if time.time()-state.last_client_at>CLIENT_TTL:break
            with state.lock:
                if state.running:
                    state.status='offline'
                    state.last_error='Flux absent ou inaccessible, nouvelle tentative automatique.'
        except Exception as error:
            log.warning('Stream issue: %s',error)
            with state.lock:
                state.status='error'
                state.last_error=str(error)[:180]
        finally:
            watchdog_stop.set()
            stop_process(ff)
            stop_process(source)
        if state.running:time.sleep(8)

@asynccontextmanager
async def lifespan(app:FastAPI):
    state.running=True
    worker=threading.Thread(target=monitor,daemon=True,name='coopx-monitor')
    worker.start()
    yield
    state.running=False

app=FastAPI(title='COOP X VISION',lifespan=lifespan)
app.include_router(cinema_router)
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS,
                   allow_methods=['GET'],allow_headers=['x-coopx-token'],
                   allow_credentials=False)

def verify(token:str|None):
    if not token or not secrets.compare_digest(token,TOKEN):
        raise HTTPException(status_code=401,detail='Code COOP X invalide')

@app.get('/health')
def health():
    return {'app':'COOP X LIVE','version':'0.7.0','ok':True}

@app.get('/api/status')
def status(x_coopx_token:str|None=Header(default=None)):
    verify(x_coopx_token)
    with state.lock:state.last_client_at=time.time()
    return state.snapshot()

@app.get('/api/events')
def events(after:int=0,x_coopx_token:str|None=Header(default=None)):
    verify(x_coopx_token)
    with state.lock:
        return {'channel':CHANNEL,'seq':state.seq,
                'events':[x for x in state.events if x['id']>after]}
