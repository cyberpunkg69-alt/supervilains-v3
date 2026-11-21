#!/usr/bin/env python3
"""LEONIDA Tracker - public read-only GTA VI discovery feed.
Standard-library Python only. No scraping of article bodies or user private data.
Original titles and links are shown; tips are categorized but not auto-verified.
"""
import concurrent.futures
import datetime as dt
import email.utils
import hashlib
import html
import json
import os
import re
import threading
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from community import Community, CommunityError

UTC=dt.timezone.utc
FEEDS=[
 ("GTABase","https://www.gtabase.com/feed/","guide"),
 ("PowerPyx","https://www.powerpyx.com/feed/","guide"),
 ("GTA BOOM","https://www.gtaboom.com/feed","guide"),
 ("Rockstar INTEL","https://rockstarintel.com/feed/","guide"),
 ("IGN","https://www.ign.com/rss/v2/articles/feed","guide"),
 ("GTA6.how","https://gta6.how/rss.xml","guide"),
 ("Reddit r/GTA6","https://www.reddit.com/r/GTA6/new/.rss?limit=75","community"),
 ("Reddit r/GTAVI","https://www.reddit.com/r/GTAVI/new/.rss?limit=75","community"),
 ("Reddit r/GTA6unmoderated","https://www.reddit.com/r/GTA6unmoderated/new/.rss?limit=75","community"),
 ("Reddit r/gtaglitches","https://www.reddit.com/r/gtaglitches/new/.rss?limit=75","community"),
]
GAME=re.compile(r"\b(gta\s*(?:6|vi)|grand theft auto\s*(?:6|vi)|leonida|vice city|jason duval|lucia caminos)\b",re.I)
TAGS=[
 ("stups",r"\b(drugs?|narcotics?|cocaine|coke|weed|marijuana|dealer|gang operations?|stash(?:es)?|drug run|stup[eé]fiants?|drogues?|trafic|gang)\b"),
 ("argent",r"\b(money|cash|earnings?|dollars?|profit|payday|glitches?|robber(?:y|ies)|heists?|vaults?|bank|receleur|fences?|safes?|loot|stolen goods?|payout|money-making|argent|braquages?|butin|coffres?)\b"),
 ("collectibles",r"\b(collectibles?|hidden|flamingos?|cards?|easter eggs?|treasures?|magazines?|secrets?|collectibles?|emplacements?|locations?|w a i n k|waink)\b"),
 ("vehicules",r"\b(cars?|vehicles?|motorcycles?|bikes?|garage|boats?|planes?|voitures?|motos?|v[eé]hicules?)\b"),
]
SOURCES={name:{"url":url,"kind":kind} for name,url,kind in FEEDS}
SOURCE_SUGGESTIONS={
 "GTABase":{"url":"https://www.gtabase.com/fr/gta-6/map/","kind":"guide"},
 "PowerPyx":{"url":"https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/","kind":"guide"},
 "FullSweep":{"url":"https://fullsweepmap.com/developers/","kind":"locations"}
}
SEED=[
 {"title":"8 méthodes pour gagner de l'argent rapidement dans GTA 6","link":"https://www.gtabase.com/fr/gta-6/articles/comment-gagner-de-largent-rapidement-dans-gta-6","source":"GTABase","category":"argent","date":"2026-11-20","noteFr":"Guide en français : activités et chapitres débloquant des sources de revenus dans le jeu.","kind":"guide"},
 {"title":"Emplacements des receleurs de GTA 6","link":"https://www.powerpyx.com/gta-6-all-fence-locations-how-to-fence-stolen-goods/","source":"PowerPyx","category":"argent","date":"2026-11-19","noteFr":"Guide des lieux où revendre les objets volés dans GTA 6. Vérifier les prérequis en jeu.","kind":"guide"},
 {"title":"Emplacements des coffres de banque","link":"https://www.powerpyx.com/gta-6-all-bank-jobs-locations-bank-vaults/","source":"PowerPyx","category":"argent","date":"2026-11-19","noteFr":"Guide des braquages de banques, avec progression et conditions de déblocage.","kind":"guide"},
 {"title":"Emplacements des flamants roses et de la cocaïne dans GTA 6","link":"https://www.powerpyx.com/gta-6-all-cocaine-flamingo-locations/","source":"PowerPyx","category":"stups","date":"2026-11-19","noteFr":"Collection et butin liés à la cocaïne dans le jeu ; le guide contient les emplacements.","kind":"guide"},
 {"title":"Opérations illégales des gangs dans GTA 6","link":"https://www.powerpyx.com/gta-6-all-illegal-gang-operations-locations/","source":"PowerPyx","category":"stups","date":"2026-11-19","noteFr":"Guide des opérations de gangs et de leur emplacement dans GTA 6.","kind":"guide"},
 {"title":"Emplacements des receleurs et vente du butin","link":"https://www.pcgamer.com/games/grand-theft-auto/gta-6-fence-locations/","source":"PC Gamer","category":"argent","date":"2026-11-19","noteFr":"Guide expliquant où écouler le butin récupéré dans le jeu.","kind":"guide"},
 {"title":"Astuce communautaire : butin de l'entrepôt Apollo Aggregates","link":"https://www.reddit.com/r/gtaglitches/comments/1y1gou5/gta_6_unlimited_money_red_barn_apollo_aggregates/","source":"Reddit r/gtaglitches","category":"argent","date":"2026-11-20","noteFr":"Signalement de joueurs sur une répétition possible de récupération de butin. À tester : un glitch peut être corrigé.","kind":"community"},
 {"title":"Astuces communautaires pour les caches d'argent","link":"https://www.reddit.com/r/GTA6unmoderated/comments/1y0tpgn/money_spots/","source":"Reddit r/GTA6unmoderated","category":"argent","date":"2026-11-20","noteFr":"Discussion de joueurs sur des caches d'argent et lieux de braquage ; positions à vérifier.","kind":"community"},
]
def cleaned(text):
 text=re.sub(r"<[^>]*>"," ",html.unescape(str(text or "")))
 return re.sub(r"\s+"," ",text).strip()[:240]
def category(text):
 for name,pattern in TAGS:
  if re.search(pattern,text,re.I):return name
 return "actualites"
def note_for(cat,kind):
 n={
 "argent":"Nouvelle piste sur l'argent, les coffres ou les revenus du jeu.",
 "stups":"Découverte liée au trafic, aux caches ou aux objets de contrebande dans GTA 6.",
 "collectibles":"Indice sur les objets à récupérer, secrets ou points d'intérêt.",
 "vehicules":"Information sur les véhicules et leurs emplacements.",
 "actualites":"Nouvelle information GTA 6 à consulter à sa source."
 }[cat]
 return ("Signalement communautaire non vérifié. " if kind=="community" else "Guide ou article externe à recouper. ")+n
def iso_date(s):
 if not s:return None
 try:
  p=email.utils.parsedate_to_datetime(s)
  if p:return p.astimezone(UTC).isoformat()
 except (ValueError,TypeError,OverflowError):pass
 try:return dt.datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(UTC).isoformat()
 except (ValueError,TypeError):return None
def tagtext(node,name):
 x=node.find(name)
 return x.text.strip() if x is not None and x.text else ""
def fetch_feed(spec):
 name,url,kind=spec
 try:
  req=urllib.request.Request(url,headers={
   "User-Agent":"LeonidaTrackerNews/1.0 (community GTA VI feed reader; links to originals)",
   "Accept":"application/rss+xml,application/atom+xml,application/xml,text/xml,*/*"
  })
  with urllib.request.urlopen(req,timeout=7) as resp:
   if int(resp.status)!=200:return name,[],False
   data=resp.read(950000)
  root=ET.fromstring(data)
  elements=list(root.findall(".//item"))
  atom=not elements
  if atom:elements=root.findall("{http://www.w3.org/2005/Atom}entry")
  result=[];now=dt.datetime.now(UTC)
  for el in elements[:100]:
   if atom:
    ns="{http://www.w3.org/2005/Atom}"
    title=tagtext(el,ns+"title")
    href=next((a.attrib.get("href","") for a in el.findall(ns+"link") if a.attrib.get("rel","alternate")=="alternate"),"")
    if not href:href=next((a.attrib.get("href","") for a in el.findall(ns+"link")),"")
    brief=tagtext(el,ns+"summary")
    when=tagtext(el,ns+"updated") or tagtext(el,ns+"published")
   else:
    title=tagtext(el,"title")
    href=tagtext(el,"link")
    brief=tagtext(el,"description")
    when=tagtext(el,"pubDate") or tagtext(el,"{http://purl.org/dc/elements/1.1/}date")
   title=cleaned(title)
   link=urllib.parse.urlparse(href)
   if link.scheme not in ("https","http") or not link.netloc or len(href)>700:continue
   text=(title+" "+cleaned(brief))
   if not GAME.search(text):continue
   published=iso_date(when)
   if published:
    parsed=dt.datetime.fromisoformat(published)
    if parsed>now+dt.timedelta(days=2) or parsed<now-dt.timedelta(days=40):continue
   cat=category(text)
   if cat=="actualites" and kind=="community":continue
   # Avoid comment replies and duplicates; show only actual posts/articles.
   if kind=="community" and not re.search(r"/comments/|/r/",href):continue
   result.append({
    "id":hashlib.sha256(href.split("?")[0].encode()).hexdigest()[:16],
    "title":title[:190],"link":href,"source":name,"category":cat,
    "date":published or "", "noteFr":note_for(cat,kind),
    "kind":kind,"status":"à confirmer" if kind=="community" else "guide externe"
   })
  return name,result,True
 except Exception:
  return name,[],False
def seed_entries():
 for item in SEED:
  d=dict(item)
  d["id"]=hashlib.sha256(item["link"].encode()).hexdigest()[:16]
  d["status"]="à confirmer" if d["kind"]=="community" else "guide externe"
  yield d
_LOCK=threading.RLock()
_CACHE={"entries":list(seed_entries()),"at":0.0,"checkedAt":"","feeds":[],"failures":[]}
def get_feed(force=False):
 now=time.time()
 with _LOCK:
  if now-_CACHE["at"]<900:return dict(_CACHE)
  # Set last checked time before external requests to prevent repeated stampedes.
  _CACHE["at"]=now
 checked=dt.datetime.now(UTC).isoformat()
 successes=[];failures=[];found=list(seed_entries())
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for name,items,ok in pool.map(fetch_feed,FEEDS):
   if ok:successes.append(name);found.extend(items)
   else:failures.append(name)
 unique={}
 for item in found:
  key=item["link"].split("?")[0].rstrip("/")
  if key not in unique:unique[key]=item
 entries=list(unique.values())
 entries.sort(key=lambda i:i.get("date","")[:10],reverse=True)
 with _LOCK:
  _CACHE.update(entries=entries[:220],at=now,checkedAt=checked,feeds=successes,failures=failures)
  return dict(_CACHE)
COMMUNITY=Community()

class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  parsed=urllib.parse.urlsplit(self.path)
  if parsed.path in ("/","/health"):
   self.reply({"ok":True,"app":"LEONIDA discoveries API","version":"1.0.0"})
   return
  if parsed.path=="/api/community/state":
   params=urllib.parse.parse_qs(parsed.query)
   self.reply(COMMUNITY.state(params.get("after",["0"])[0]))
   return
  if parsed.path not in ("/api/discoveries","/api/refresh"):
   self.reply({"error":"endpoint inconnu"},404);return
  d=get_feed(force=parsed.path=="/api/refresh")
  self.reply({
   "version":1,"checkedAt":d["checkedAt"],
   "sourcesOnline":d["feeds"],"sourcesUnavailable":d["failures"],
   "entries":d["entries"],"count":len(d["entries"]),
   "disclaimer":"Articles externes et discussions de joueurs ; aucun emplacement ni glitch n'est vérifié automatiquement."
  })
 def do_POST(self):
  parsed=urllib.parse.urlsplit(self.path)
  actions={
   "/api/community/join":"join",
   "/api/community/heartbeat":"heartbeat",
   "/api/community/leave":"leave",
   "/api/community/send":"send",
   "/api/community/report":"report",
   "/api/community/delete":"delete",
  }
  action=actions.get(parsed.path)
  if not action:self.reply({"error":"endpoint inconnu"},404);return
  origin=self.headers.get("Origin","")
  if origin not in ("https://leonida-tracker-gta6.onrender.com","http://localhost:8000","http://127.0.0.1:8000"):
   self.reply({"error":"Origine refusée."},403);return
  if not self.headers.get("Content-Type","").lower().startswith("application/json"):
   self.reply({"error":"Utilise application/json."},415);return
  try:
   length=int(self.headers.get("Content-Length","0"))
  except (ValueError,TypeError):length=0
  if length<=0 or length>2400:self.reply({"error":"Requête trop volumineuse ou vide."},413);return
  try:
   body=json.loads(self.rfile.read(length).decode("utf-8"))
   if not isinstance(body,dict):raise ValueError("Objet JSON requis")
  except (ValueError,UnicodeDecodeError):
   self.reply({"error":"JSON invalide."},400);return
  try:
   sid=body.get("sid")
   if action=="join":result=COMMUNITY.join(sid,body.get("page"))
   elif action=="heartbeat":result=COMMUNITY.heartbeat(sid)
   elif action=="leave":result=COMMUNITY.leave(sid)
   elif action=="send":
    # Never trust nickname or chat HTML, and hash the ephemeral client IP only for throttling.
    ip=self.headers.get("CF-Connecting-IP") or self.headers.get("X-Forwarded-For","").split(",")[0] or self.client_address[0]
    result=COMMUNITY.send(sid,body.get("nickname"),body.get("text"),ip)
   elif action=="report":result=COMMUNITY.report(sid,body.get("messageId"))
   else:result=COMMUNITY.delete_own(sid,body.get("messageId"))
   self.reply(result)
  except CommunityError as exc:self.reply({"error":exc.msg},exc.code)
  except Exception:self.reply({"error":"Erreur de traitement du chat."},500)

 def do_OPTIONS(self):
  self.send_response(204);self.add_response_headers();self.end_headers()
 def add_response_headers(self):
  origin=self.headers.get("Origin","")
  self.send_header("Access-Control-Allow-Origin",origin if origin in ("https://leonida-tracker-gta6.onrender.com","http://localhost:8000","http://127.0.0.1:8000") else "https://leonida-tracker-gta6.onrender.com")
  self.send_header("Vary","Origin")
  self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
  self.send_header("Access-Control-Allow-Headers","Content-Type")
  self.send_header("Cache-Control","no-store" if self.path.startswith("/api/community/") else "public, max-age=300")
  self.send_header("X-Content-Type-Options","nosniff")
 def reply(self,obj,status=200):
  data=json.dumps(obj,ensure_ascii=False,separators=(",",":")).encode("utf-8")
  self.send_response(status);self.add_response_headers()
  self.send_header("Content-Type","application/json; charset=utf-8")
  self.send_header("Content-Length",str(len(data)))
  self.end_headers();self.wfile.write(data)
 def log_message(self,fmt,*args):pass
if __name__=="__main__":
 port=int(os.environ.get("PORT","8000"))
 ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()
