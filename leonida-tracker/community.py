"""LEONIDA TRACKER — community chat + live presence (anonymous, in-memory).
This module intentionally does not store identifying IPs, emails, or real names.
Counts/messages reset when a free Render instance restarts. No false persistence claims.
"""
from collections import deque, defaultdict
from datetime import datetime, timezone
from threading import RLock
import hashlib
import os
import re
import secrets
import time
import unicodedata

SESSION_ID=re.compile(r"^[a-zA-Z0-9_-]{16,100}$")
PAGE_ID=re.compile(r"^[a-zA-Z0-9_-]{12,100}$")
EMAIL=re.compile(r"\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b", re.I)
URL=re.compile(r"(?:https?://|www\.|discord\.gg|t\.me/)",re.I)
PHONE=re.compile(r"(?<!\d)(?:\+?\d[\s.-]*){9,15}(?!\d)")
DISALLOWED_NAME=re.compile(r"^(?:admin|administrateur|moderateur|modérateur|mod|staff|rockstar|support|leonida\s*tracker|systeme|système)$",re.I)
MESSAGE_TTL=24*3600
PRESENCE_TTL=65
MAX_LENGTH=320
MAX_CLIENTS=5000
MESSAGE_LIMIT=200
ALLOWED_CONTROL={'\n','\t'}

class CommunityError(Exception):
 def __init__(self,msg,code=400):
  self.msg=msg
  self.code=code

class Community:
 def __init__(self):
  self.lock=RLock()
  self.started=datetime.now(timezone.utc).isoformat()
  self.instance=secrets.token_hex(8)
  self.views=0
  self.visitor_ids=set()
  self.pages={}
  self.presence={}
  self.messages=deque(maxlen=MESSAGE_LIMIT)
  self.next_id=0
  self.send_times=defaultdict(deque)
  self.reported={}
  self.ip_salt=os.urandom(32)

 def _ip_key(self,ip):
  return hashlib.blake2s(str(ip or "").encode("utf-8"),key=self.ip_salt,digest_size=12).hexdigest()

 def _check_session(self,session):
  session=str(session or "")
  if not SESSION_ID.fullmatch(session):raise CommunityError("Identifiant de session invalide.",400)
  return session

 def _cleanup(self,now):
  for sid,ts in list(self.presence.items()):
   if now-ts>PRESENCE_TTL:self.presence.pop(sid,None)
  for page,ts in list(self.pages.items()):
   if now-ts>3600:self.pages.pop(page,None)
  while self.messages and now-self.messages[0]["epoch"]>MESSAGE_TTL:self.messages.popleft()
  # Keep rate-limit maps bounded even after traffic peaks.
  if len(self.send_times)>MAX_CLIENTS:self.send_times.clear()
  if len(self.reported)>MESSAGE_LIMIT:self.reported={k:v for k,v in self.reported.items() if any(m["id"]==k for m in self.messages)}

 def _status(self):
  return {"views":self.views,"online":len(self.presence),"instance":self.instance,"started":self.started,
    "lastId":self.next_id,"temporary":True,
    "notice":"Visiteurs uniques par identifiant navigateur (aucune adresse MAC). Stockage temporaire en attente de connexion à la base PostgreSQL.",
    "mode":"temporary","mediaUploads":False}

 def join(self,sid,page):
  sid=self._check_session(sid)
  page=str(page or "")
  if not PAGE_ID.fullmatch(page):raise CommunityError("Identifiant de page invalide.")
  with self.lock:
   now=time.time();self._cleanup(now)
   # One count per browser ID, regardless of refreshes or reconnections.
   if sid not in self.visitor_ids:
    self.visitor_ids.add(sid)
    self.views+=1
   self.pages[page]=now
   self.presence[sid]=now
   return self._status()

 def heartbeat(self,sid):
  sid=self._check_session(sid)
  with self.lock:
   now=time.time();self._cleanup(now)
   self.presence[sid]=now
   return self._status()

 def leave(self,sid):
  sid=self._check_session(sid)
  with self.lock:
   self.presence.pop(sid,None)
   return self._status()

 def state(self,after=0):
  with self.lock:
   self._cleanup(time.time())
   try:after=max(0,int(after))
   except (ValueError,TypeError):after=0
   items=[{k:m[k] for k in ("id","nickname","text","date","hidden")} for m in self.messages if m["id"]>after]
   # On first open show recent messages; when after > 0 return only deltas.
   if after==0:items=items[-55:]
   obj=self._status()
   obj["messages"]=items
   obj["chatNotice"]="Pseudo public, messages non privés. Signale les abus et évite de partager des données personnelles."
   return obj

 def send(self,sid,nick,text,ip):
  sid=self._check_session(sid)
  nick=unicodedata.normalize("NFKC",str(nick or "")).strip()
  text=unicodedata.normalize("NFKC",str(text or "")).strip()
  if not 2<=len(nick)<=22 or not re.fullmatch(r"[\wÀ-ÿ .'-]+",nick,re.UNICODE) or DISALLOWED_NAME.fullmatch(nick):
   raise CommunityError("Pseudo invalide (2 à 22 caractères, sans nom réservé).")
  if not 2<=len(text)<=MAX_LENGTH:raise CommunityError("Le message doit contenir de 2 à 320 caractères.")
  if any(ord(c)<32 and c not in ALLOWED_CONTROL for c in text):raise CommunityError("Le message contient des caractères invalides.")
  if URL.search(text) or EMAIL.search(text) or PHONE.search(text):
   raise CommunityError("Pour la sécurité du chat, les liens et coordonnées personnelles ne sont pas autorisés.")
  # Lightweight aggressive/harassment filter. Game vocabulary like "braquage" is not blocked.
  if re.search(r"\b(?:suicidez.vous|va\s+te\s+tuer|je\s+vais\s+te\s+tuer|sale\s+(?:n[eè]gre|p[dé]d[eé]))\b",text,re.I):
   raise CommunityError("Message bloqué par le filtre de sécurité.")
  with self.lock:
   now=time.time();self._cleanup(now)
   if sid not in self.presence:raise CommunityError("Session expirée : recharge le chat.",403)
   haship=self._ip_key(ip)
   for key,limit in (("sid:"+sid,4),("ip:"+haship,20)):
    q=self.send_times[key]
    while q and now-q[0]>60:q.popleft()
    if len(q)>=limit:raise CommunityError("Tu envoies trop vite. Réessaie dans une minute.",429)
   for key in ("sid:"+sid,"ip:"+haship):self.send_times[key].append(now)
   self.next_id+=1
   item={"id":self.next_id,"nickname":nick,"text":text,"date":datetime.now(timezone.utc).isoformat(),
     "epoch":now,"hidden":False,"sid":sid}
   self.messages.append(item)
   return {"ok":True,"messageId":self.next_id}

 def report(self,sid,msg_id):
  sid=self._check_session(sid)
  try:msg_id=int(msg_id)
  except (ValueError,TypeError):raise CommunityError("Message introuvable.")
  with self.lock:
   m=next((m for m in self.messages if m["id"]==msg_id),None)
   if m is None:raise CommunityError("Ce message n'est plus disponible.",404)
   if sid not in self.presence:raise CommunityError("Session expirée.",403)
   if m["sid"]==sid:raise CommunityError("Tu ne peux pas signaler ton propre message.")
   self.reported.setdefault(msg_id,set()).add(sid)
   if len(self.reported[msg_id])>=3:m["hidden"]=True
   return {"ok":True,"reports":len(self.reported[msg_id]),"hidden":m["hidden"]}

 def delete_own(self,sid,msg_id):
  sid=self._check_session(sid)
  try:msg_id=int(msg_id)
  except (ValueError,TypeError):raise CommunityError("Message introuvable.")
  with self.lock:
   m=next((m for m in self.messages if m["id"]==msg_id),None)
   if m is None:raise CommunityError("Ce message n'est plus disponible.",404)
   if m["sid"]!=sid:raise CommunityError("Tu ne peux supprimer que tes messages.",403)
   m["hidden"]=True
   return {"ok":True}
