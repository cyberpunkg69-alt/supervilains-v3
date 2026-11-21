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
import base64
import binascii
import urllib.parse

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


def validate_media_url(raw):
 value=str(raw or "").strip()
 if not value:return "",""
 if len(value)>800:raise CommunityError("Lien trop long.")
 try:
  p=urllib.parse.urlsplit(value)
  host=(p.hostname or "").lower()
 except ValueError:raise CommunityError("Adresse invalide.")
 if p.scheme!="https" or p.username or p.password or not host:
  raise CommunityError("Utilise une URL HTTPS publique valide.")
 path=p.path.lower()
 if host in ("www.youtube.com","youtube.com","m.youtube.com","youtu.be","www.youtube-nocookie.com"):
  if host=="youtu.be" and re.fullmatch(r"/[a-zA-Z0-9_-]{11}",p.path):return value,"video"
  if path=="/watch" and re.fullmatch(r"[A-Za-z0-9_-]{11}",urllib.parse.parse_qs(p.query).get("v",[""])[0]):return value,"video"
  if re.fullmatch(r"/(?:shorts|live|embed)/[a-zA-Z0-9_-]{11}/?",p.path):return value,"video"
 elif host in ("twitch.tv","www.twitch.tv","clips.twitch.tv"):
  if re.fullmatch(r"/(?:videos/\d+|[a-zA-Z0-9_]+/clip/[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+)",p.path):return value,"video"
 elif host in ("www.tiktok.com","tiktok.com"):
  if re.fullmatch(r"/@[a-zA-Z0-9_.]+/video/\d+",p.path):return value,"video"
 elif host in ("i.imgur.com","i.redd.it","images.unsplash.com"):
  if re.search(r"\.(?:png|jpe?g|webp)$",path) or host=="images.unsplash.com":return value,"image"
 raise CommunityError("Lien non autorisé : utilise YouTube, Twitch, TikTok ou une image Imgur/Reddit.")


def validate_upload(mime,data):
 if mime not in ("image/jpeg","image/png","image/webp","video/mp4","video/webm"):
  raise CommunityError("Format refusé. Formats admis : JPG, PNG, WebP, MP4, WebM.")
 if not isinstance(data,str) or len(data)>4_500_000:
  raise CommunityError("Fichier trop volumineux (max. 2,5 Mo pour les vidéos).",413)
 try:decoded=base64.b64decode(data,validate=True)
 except (binascii.Error,ValueError):raise CommunityError("Fichier endommagé.")
 limit=1_000_000 if mime.startswith("image/") else 2_500_000
 if len(decoded)>limit:raise CommunityError("Fichier trop volumineux.",413)
 valid={
  "image/jpeg":decoded.startswith(b"\xff\xd8\xff"),
  "image/png":decoded.startswith(b"\x89PNG\r\n\x1a\n"),
  "image/webp":decoded.startswith(b"RIFF") and decoded[8:12]==b"WEBP",
  "video/mp4":len(decoded)>12 and decoded[4:8]==b"ftyp",
  "video/webm":decoded.startswith(b"\x1a\x45\xdf\xa3")
 }[mime]
 if not valid:raise CommunityError("Le type du fichier ne correspond pas à son contenu.")
 return decoded


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
  self.uploads={}
  self.upload_times=defaultdict(deque)

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
  for mid,media in list(self.uploads.items()):
   if now-media["epoch"]>4*3600 or media.get("hidden"):self.uploads.pop(mid,None)
  # Keep the RAM cache for short clips bounded and explicit.
  while sum(len(u["bytes"]) for u in self.uploads.values())>20_000_000 and self.uploads:
   self.uploads.pop(next(iter(self.uploads)))

 def _status(self):
  return {"views":self.views,"online":len(self.presence),"instance":self.instance,"started":self.started,
    "lastId":self.next_id,"temporary":True,
    "notice":"Visiteurs uniques par identifiant navigateur (aucune adresse MAC). Stockage temporaire en attente de connexion à la base PostgreSQL.",
    "mode":"temporary","mediaUploads":True}

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
   items=[{k:m.get(k) for k in ("id","nickname","text","date","hidden","mediaUrl","mediaKind","mediaId")} for m in self.messages if m["id"]>after]
   # On first open show recent messages; when after > 0 return only deltas.
   if after==0:items=items[-55:]
   obj=self._status()
   obj["messages"]=items
   obj["chatNotice"]="Pseudo public, messages non privés. Signale les abus et évite de partager des données personnelles."
   return obj

 def send(self,sid,nick,text,ip,media_url='',media_id=''):
  sid=self._check_session(sid)
  nick=unicodedata.normalize("NFKC",str(nick or "")).strip()
  text=unicodedata.normalize("NFKC",str(text or "")).strip()
  if not 2<=len(nick)<=22 or not re.fullmatch(r"[\wÀ-ÿ .'-]+",nick,re.UNICODE) or DISALLOWED_NAME.fullmatch(nick):
   raise CommunityError("Pseudo invalide (2 à 22 caractères, sans nom réservé).")
  media_url,media_kind=validate_media_url(media_url)
  if not (2<=len(text)<=MAX_LENGTH or (not text and (media_url or media_id))):raise CommunityError("Écris un message ou joins un média (320 caractères maximum).")
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
   attachment=None
   if media_id:
    attachment=self.uploads.get(str(media_id))
    if not attachment or attachment['owner']!=sid or attachment.get('hidden'):
     raise CommunityError('Pièce jointe indisponible ou expirée.')
    media_kind='video' if attachment['mime'].startswith('video/') else 'image'
    media_url='/api/community/media/'+str(media_id)
   self.next_id+=1
   item={"id":self.next_id,"nickname":nick,"text":text,"date":datetime.now(timezone.utc).isoformat(),
     "epoch":now,"hidden":False,"sid":sid,"mediaUrl":media_url,"mediaKind":media_kind or "", "mediaId":str(media_id or "")}
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
   if len(self.reported[msg_id])>=3:
    m["hidden"]=True
    if m.get('mediaId') in self.uploads:self.uploads[m['mediaId']]['hidden']=True
   return {"ok":True,"reports":len(self.reported[msg_id]),"hidden":m["hidden"]}

 def delete_own(self,sid,msg_id):
  sid=self._check_session(sid)
  try:msg_id=int(msg_id)
  except (ValueError,TypeError):raise CommunityError("Message introuvable.")
  with self.lock:
   m=next((m for m in self.messages if m["id"]==msg_id),None)
   if m is None:raise CommunityError("Ce message n'est plus disponible.",404)
   if m["sid"]!=sid:raise CommunityError("Tu ne peux supprimer que tes messages.",403)
   m['hidden']=True
   if m.get('mediaId') in self.uploads:self.uploads[m['mediaId']]['hidden']=True
   return {'ok':True}

# Media operations are added as methods so they can later be overridden by a persistent store.
def _community_upload(self,sid,mime,contents):
 sid=self._check_session(sid)
 decoded=validate_upload(mime,contents)
 with self.lock:
  now=time.time();self._cleanup(now)
  if sid not in self.presence:raise CommunityError("Session expirée : reconnecte-toi.",403)
  times=self.upload_times[sid]
  while times and now-times[0]>300:times.popleft()
  if len(times)>=3:raise CommunityError("Maximum trois fichiers toutes les cinq minutes.",429)
  if sum(len(i['bytes']) for i in self.uploads.values())+len(decoded)>20_000_000:
   raise CommunityError("Espace média temporaire saturé. Réessaie plus tard.",503)
  mid=secrets.token_urlsafe(18)
  self.uploads[mid]={"owner":sid,"mime":mime,"bytes":decoded,"epoch":now,"hidden":False}
  times.append(now)
  return {"ok":True,"mediaId":mid,"mediaUrl":"/api/community/media/"+mid,"temporary":True}

def _community_get_media(self,mid):
 with self.lock:
  self._cleanup(time.time())
  obj=self.uploads.get(mid)
  if not obj or obj.get("hidden"):return None
  # Uploaded media is only accessible after the sender has linked it in a chat message.
  if not any(m.get("mediaId")==mid and not m.get("hidden") for m in self.messages):return None
  return obj["mime"],obj["bytes"]

Community.upload=_community_upload
Community.get_media=_community_get_media
