"""Optional PostgreSQL persistence for LEONIDA Tracker community features.

Active only when DATABASE_URL and the psycopg driver are configured on Render.
This database stores pseudonymous browser tokens as SHA-256 hashes, never MAC addresses.
Media are stored as BYTEA; use a dedicated object store for serious production scale.
"""
import datetime as dt
import hashlib
import os
from community import Community, CommunityError

def shash(sid):
 return hashlib.sha256(str(sid).encode("utf-8")).hexdigest()

class PersistentCommunity(Community):
 def __init__(self,url):
  super().__init__()
  import psycopg
  self.psycopg=psycopg
  self.db_url=url
  self._init_schema()

 def db(self):
  return self.psycopg.connect(self.db_url,connect_timeout=7)

 def _init_schema(self):
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("""CREATE TABLE IF NOT EXISTS leonida_unique_visitors(
      visitor_hash TEXT PRIMARY KEY, first_seen TIMESTAMPTZ NOT NULL DEFAULT now())""")
    cur.execute("""CREATE TABLE IF NOT EXISTS leonida_chat_messages(
      id BIGSERIAL PRIMARY KEY, owner_hash TEXT NOT NULL, nickname VARCHAR(22) NOT NULL,
      body VARCHAR(320) NOT NULL, media_url VARCHAR(800) NOT NULL DEFAULT '',
      media_kind VARCHAR(12) NOT NULL DEFAULT '', media_id VARCHAR(75) NOT NULL DEFAULT '',
      hidden BOOLEAN NOT NULL DEFAULT FALSE, sent_at TIMESTAMPTZ NOT NULL DEFAULT now())""")
    cur.execute("""CREATE INDEX IF NOT EXISTS leonida_messages_recent_idx
      ON leonida_chat_messages(id DESC)""")
    cur.execute("""CREATE TABLE IF NOT EXISTS leonida_chat_reports(
      message_id BIGINT NOT NULL, reporter_hash TEXT NOT NULL,
      reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(message_id,reporter_hash))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS leonida_media_objects(
      id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, content_type VARCHAR(32) NOT NULL,
      content BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())""")

 def _views(self):
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("SELECT count(*) FROM leonida_unique_visitors")
    return cur.fetchone()[0]

 def _status(self):
  data=super()._status()
  data.update(views=self._views(),temporary=False,mode='persistent',mediaUploads=True,
   notice="Identifiant navigateur pseudonyme. Données stockées en PostgreSQL ; la base gratuite Render expire le 21 décembre 2026, sauf migration ou changement d'offre.")
  return data

 def join(self,sid,page):
  self._check_session(sid)
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("INSERT INTO leonida_unique_visitors(visitor_hash) VALUES(%s) ON CONFLICT DO NOTHING",(shash(sid),))
  return super().join(sid,page)

 def state(self,after=0):
  status=super().state(after=0)
  try:after=max(0,int(after))
  except (ValueError,TypeError):after=0
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("""SELECT id,nickname,body,sent_at,hidden,media_url,media_kind,media_id
      FROM leonida_chat_messages WHERE id>%s ORDER BY id DESC LIMIT 80""",(after,))
    items=cur.fetchall()
  status["messages"]=[{
   "id":r[0],"nickname":r[1],"text":r[2],
   "date":r[3].astimezone(dt.timezone.utc).isoformat(),
   "hidden":r[4],"mediaUrl":r[5] if not r[4] else "",
   "mediaKind":r[6] if not r[4] else "",
   "mediaId":r[7] if not r[4] else ""
  } for r in reversed(items)]
  return status

 def report(self,sid,msg_id):
  self._check_session(sid)
  try:msg_id=int(msg_id)
  except (TypeError,ValueError):raise CommunityError("Message introuvable.",400)
  if sid not in self.presence:raise CommunityError("Session expirée.",403)
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("SELECT owner_hash FROM leonida_chat_messages WHERE id=%s",(msg_id,))
    owner=cur.fetchone()
    if not owner:raise CommunityError("Message introuvable.",404)
    if owner[0]==shash(sid):raise CommunityError("Tu ne peux pas signaler ton propre message.",403)
    cur.execute("""INSERT INTO leonida_chat_reports(message_id,reporter_hash)
      VALUES (%s,%s) ON CONFLICT DO NOTHING""",(msg_id,shash(sid)))
    cur.execute("SELECT count(*) FROM leonida_chat_reports WHERE message_id=%s",(msg_id,))
    count=cur.fetchone()[0]
    if count>=3:cur.execute("UPDATE leonida_chat_messages SET hidden=TRUE WHERE id=%s",(msg_id,))
  return {"ok":True,"reports":count,"hidden":count>=3}

 def delete_own(self,sid,msg_id):
  self._check_session(sid)
  try:msg_id=int(msg_id)
  except (TypeError,ValueError):raise CommunityError("Message introuvable.",400)
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("UPDATE leonida_chat_messages SET hidden=TRUE WHERE id=%s AND owner_hash=%s RETURNING media_id",(msg_id,shash(sid)))
    row=cur.fetchone()
    if row is None:raise CommunityError("Message introuvable ou accès refusé.",403)
    if row[0]:cur.execute("DELETE FROM leonida_media_objects WHERE id=%s",(row[0],))
  return {"ok":True}

 def upload(self,sid,mime,contents):
  receipt=super().upload(sid,mime,contents)
  item=self.uploads[receipt["mediaId"]]
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("SELECT COALESCE(sum(octet_length(content)),0) FROM leonida_media_objects")
    used=cur.fetchone()[0]
    if used+len(item["bytes"])>50_000_000:
     raise CommunityError("Quota de stockage des médias atteint. Réessaie plus tard.",503)
    cur.execute("""INSERT INTO leonida_media_objects(id,owner_hash,content_type,content)
      VALUES(%s,%s,%s,%s)""",(receipt["mediaId"],shash(sid),mime,item["bytes"]))
  receipt["temporary"]=False
  self.uploads.pop(receipt["mediaId"],None)
  return receipt

 def send(self,sid,nick,text,ip,media_url="",media_id=""):
  # The base validator expects a freshly uploaded file in memory. A single pending
  # attachment remains there until submission, while DB keeps durable bytes.
  if media_id and media_id not in self.uploads:
   with self.db() as conn:
    with conn.cursor() as cur:
     cur.execute("SELECT owner_hash,content_type FROM leonida_media_objects WHERE id=%s",(media_id,))
     row=cur.fetchone()
     if not row or row[0]!=shash(sid):raise CommunityError("Pièce jointe indisponible.",400)
     self.uploads[media_id]={"owner":sid,"mime":row[1],"bytes":b"","epoch":__import__('time').time(),"hidden":False}
  receipt=super().send(sid,nick,text,ip,media_url,media_id)
  pending=self.messages[-1]
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("""INSERT INTO leonida_chat_messages
      (owner_hash,nickname,body,media_url,media_kind,media_id)
      VALUES(%s,%s,%s,%s,%s,%s) RETURNING id""",
      (shash(sid),pending["nickname"],pending["text"],pending.get("mediaUrl",""),
       pending.get("mediaKind",""),pending.get("mediaId","")))
    receipt["messageId"]=cur.fetchone()[0]
  return receipt

 def get_media(self,mid):
  with self.db() as conn:
   with conn.cursor() as cur:
    cur.execute("""SELECT m.content_type,m.content
      FROM leonida_media_objects m
      WHERE m.id=%s AND EXISTS(
        SELECT 1 FROM leonida_chat_messages c
        WHERE c.media_id=m.id AND c.hidden=FALSE)
      LIMIT 1""",(mid,))
    row=cur.fetchone()
    if not row:return None
    return row[0],bytes(row[1])

def make_community():
 url=os.environ.get("DATABASE_URL","").strip()
 if not url:return Community()
 try:
  return PersistentCommunity(url)
 except Exception as exc:
  # Do not silently pretend persistence works when a DATABASE_URL is configured.
  raise RuntimeError("PostgreSQL persistence unavailable: "+str(exc)) from exc
