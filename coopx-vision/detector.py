"""Experimental OCR detection on Twitch frame pixels; not trained on Gears E-Day."""
from __future__ import annotations
from dataclasses import dataclass
import re
import time
import unicodedata
import cv2
import numpy as np
import pytesseract

def fold(value: str) -> str:
    value=unicodedata.normalize('NFD',value.upper())
    value=''.join(c for c in value if not unicodedata.combining(c))
    return re.sub(r'\s+',' ',value).strip()

RULES=(
 ('revive_prompt','Indication de réanimation visible',(r'REANIM',r'REVIVE',r'RESUSCIT',r'RANIMER')),
 ('downed','Mention de joueur à terre visible',(r'A TERRE',r'DOWNED',r'INCAPACIT',r'BLEED OUT')),
 ('objective_complete','Objectif terminé affiché',(r'OBJECTIF (TERMINE|ACCOMPLI|REUSSI)',r'OBJECTIVE (COMPLETE|COMPLETED)',r'MISSION (ACCOMPLIE|TERMINEE|COMPLETE|COMPLETED)',r'VICTORY')),
 ('mission_failed','Échec de mission affiché',(r'MISSION (ECHOUEE|FAILED)',r'OBJECTIVE FAILED',r'GAME OVER')),
 ('wave','Numéro de vague affiché',(r'\bVAGUE\s*\d{1,2}\b',r'\bWAVE\s*\d{1,2}\b'))
)

def candidate_labels(text: str):
    t=fold(text)
    found=[]
    for kind,label,patterns in RULES:
        for pattern in patterns:
            match=re.search(pattern,t)
            if match:
                unique=kind+(':'+match.group(0) if kind=='wave' else '')
                found.append((unique,kind,label))
                break
    return found

def read_text(frame:np.ndarray)->str:
    if frame is None or frame.size==0:return ''
    h,w=frame.shape[:2]
    scale=min(2.,1280/max(w,1))
    if scale>1:frame=cv2.resize(frame,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
    gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
    enhanced=cv2.createCLAHE(clipLimit=2.,tileGridSize=(8,8)).apply(gray)
    try:
        langs=pytesseract.get_languages(config='')
        lang='eng+fra' if 'fra' in langs else 'eng'
    except Exception:
        lang='eng'
    return pytesseract.image_to_string(enhanced,lang=lang,config='--psm 11',timeout=10)[:3500]

@dataclass
class FrameEvent:
    kind:str
    label:str
    detected_text:str
    timestamp:float

class StableMatcher:
    def __init__(self,need_frames:int=2,cooldown:float=30):
        self.need_frames=need_frames
        self.cooldown=cooldown
        self.streak={}
        self.active=set()
        self.last_sent={}
    def update(self,text:str,ts:float|None=None)->list[FrameEvent]:
        now=time.time() if ts is None else ts
        found=candidate_labels(text)
        keys={match[0] for match in found}
        self.streak={k:v for k,v in self.streak.items() if k in keys}
        self.active &= keys
        result=[]
        for unique,kind,label in found:
            self.streak[unique]=self.streak.get(unique,0)+1
            if (self.streak[unique]>=self.need_frames and unique not in self.active and
                    now-self.last_sent.get(unique,-1e10)>=self.cooldown):
                self.active.add(unique)
                self.last_sent[unique]=now
                result.append(FrameEvent(kind,label,fold(text)[:150],now))
        return result
