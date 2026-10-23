"use strict";
(() => {
  const API = "https://nhmraocljiugwlgflhfn.supabase.co/functions/v1/manu-encheres";
  const byId = (id) => document.getElementById(id);
  const els = {
    current: byId("current-bid"), leader: byId("leader"), heading: byId("price-heading"),
    bidsCount: byId("bids-count"), playersCount: byId("players-count"),
    lastBid: byId("last-bid"), list: byId("bid-list"),
    nickname: byId("nickname"), amount: byId("bid-amount"),
    feedback: byId("feedback"), submit: byId("submit-bid"),
    form: byId("bid-form"), status: byId("connection-label"),
    statusOuter: document.querySelector(".live-status"), confetti: byId("confetti")
  };
  const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const money = (n) => euro.format(n) + " €";
  const safeStore = {
    get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, val) => { try { localStorage.setItem(key, val); } catch { /* navigation privée */ } }
  };
  const genToken = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const random = new Uint8Array(20); crypto.getRandomValues(random);
    return Array.from(random, b => b.toString(16).padStart(2,"0")).join("");
  };
  let token = safeStore.get("manu-auction-token");
  if (!token || !/^[a-zA-Z0-9_-]{16,80}$/.test(token)) {
    token = genToken(); safeStore.set("manu-auction-token", token);
  }
  els.nickname.value = safeStore.get("manu-auction-pseudo") || "";
  els.nickname.addEventListener("change", () => safeStore.set("manu-auction-pseudo", els.nickname.value.trim()));
  let currentBid = 0, closed = false, busy = false, requestPending = false;
  let previousBid = -1, lastTimestamp = null;
  let dataLoaded = false;

  const setFeedback = (message, kind = "info") => {
    els.feedback.textContent = message;
    els.feedback.className = "feedback " + kind;
  };
  const setConnection = (online) => {
    els.status.textContent = online ? "EN DIRECT • CONNECTÉ" : "CONNEXION À RÉTABLIR";
    els.statusOuter.classList.toggle("offline", !online);
  };
  const relativeTime = (iso) => {
    if (!iso) return "—";
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (!Number.isFinite(seconds)) return "—";
    if (seconds < 10) return "À l'instant";
    if (seconds < 60) return seconds + " s";
    if (seconds < 3600) return Math.floor(seconds / 60) + " min";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " h";
    return Math.floor(seconds / 86400) + " j";
  };
  const api = async (method, body) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(API, {
        method, cache: "no-store", signal: controller.signal,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Une erreur est survenue.");
      return json;
    } finally { clearTimeout(timeout); }
  };
  const freshMin = () => Math.min(99999, currentBid + 1);
  const setInputMin = () => {
    const min = freshMin();
    els.amount.min = String(min);
    if (!Number.isSafeInteger(Number(els.amount.value)) || Number(els.amount.value) < min) {
      els.amount.value = String(min);
    }
  };

  // Notifications facultatives : les permissions ne sont demandées qu'au clic.
  const pushToggle = byId("push-toggle");
  const pushStatus = byId("push-status");
  const bidToast = byId("bid-toast");
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  const needsAppleInstall = isAppleMobile && !isStandalone;
  const iosSetup = byId("ios-setup");
  if (isAppleMobile) document.body.classList.add("apple-device");
  if (needsAppleInstall && iosSetup) iosSetup.hidden = false;

  const pushSupported = Boolean(
    window.isSecureContext && "serviceWorker" in navigator &&
    "PushManager" in window && "Notification" in window
  );
  let vapidPublic = "";
  let pushBusy = false;
  let pushOn = false;
  let toastTimeout = null;
  const pushMessage = (message) => { pushStatus.textContent = message; };
  const reflectPushButton = () => {
    if (needsAppleInstall) {
      pushToggle.disabled = false;
      pushToggle.textContent = "🍎 COMMENT ACTIVER SUR IPHONE / IPAD";
      pushMessage("Sur iPhone, il faut d'abord ajouter le site à l'écran d'accueil.");
      return;
    }
    if (!pushSupported) {
      pushToggle.disabled = true;
      pushToggle.textContent = "🔕 NON DISPONIBLE ICI";
      pushMessage(isAppleMobile ? "Notifications indisponibles : iOS / iPadOS 16.4 ou plus récent requis, et ouverture depuis l’écran d’accueil." : "Ouvre cette page dans Chrome sur Android pour recevoir des alertes.");
      return;
    }
    pushToggle.disabled = pushBusy;
    pushToggle.textContent = pushOn ? "🔕 DÉSACTIVER LES NOTIFICATIONS" : "🔔 ACTIVER LES NOTIFICATIONS";
  };
  const announceNewBid = (data) => {
    if (!data.leader || !data.current_bid || !dataLoaded) return;
    const who = String(data.leader);
    bidToast.textContent = "🔔 Nouvelle offre ! " + who + " vient de miser " +
      money(data.current_bid) + ". À qui le tour ? 😂";
    bidToast.classList.add("visible");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => bidToast.classList.remove("visible"), 8000);
  };
  const publicKeyBytes = (value) => {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  };
  async function getPushRegistration() {
    const reg = await navigator.serviceWorker.register("./sw.js?v=20261022ios1", {scope: "./"});
    await navigator.serviceWorker.ready;
    return reg;
  }
  async function updatePushState() {
    if (needsAppleInstall || !pushSupported) { reflectPushButton(); return; }
    try {
      const reg = await getPushRegistration();
      const subscription = await reg.pushManager.getSubscription();
      pushOn = Boolean(subscription && Notification.permission === "granted");
      if (pushOn && subscription) {
        // Restaure les alertes après un changement de réseau ou d'adresse IP.
        api("POST", {action: "subscribe", token, subscription: subscription.toJSON()})
         .catch(err => console.warn("réinscription notifications:", err.message));
      }
      pushMessage(pushOn ? "✅ Alertes activées, même lorsque l’application est fermée (selon les réglages du téléphone)."
        : Notification.permission === "denied"
          ? "Notifications bloquées dans les réglages du navigateur."
          : "Facultatif • tu peux les activer pour suivre l'enchère de MANU.");
    } catch (e) {
      pushMessage(isAppleMobile ? "Impossible ici : ouvre l’app MANU depuis son icône sur l’écran d’accueil." : "Notifications indisponibles dans ce navigateur. Utilise Chrome.");
    } finally {
      reflectPushButton();
    }
  }
  pushToggle.addEventListener("click", async () => {
    if (needsAppleInstall) {
      if (iosSetup) {
        iosSetup.hidden = false;
        iosSetup.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (!pushSupported || pushBusy) return;
    pushBusy = true;
    reflectPushButton();
    try {
      // Requête immédiate depuis le clic : les navigateurs exigent un geste utilisateur.
      if (!pushOn && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          pushMessage("Notifications refusées : vérifie les réglages de notifications de ton navigateur ou de l’app MANU.");
          return;
        }
      }
      const reg = await getPushRegistration();
      let subscription = await reg.pushManager.getSubscription();
      if (pushOn) {
        if (subscription) {
          await api("POST", {action: "unsubscribe", token, endpoint: subscription.endpoint});
          await subscription.unsubscribe();
        }
        pushOn = false;
        pushMessage("🔕 Alertes désactivées. Tu peux les réactiver à tout moment.");
      } else {
        if (!vapidPublic) {
          const state = await api("GET");
          vapidPublic = state.vapid_public || "";
        }
        if (!vapidPublic) throw new Error("Clé de notification indisponible.");
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKeyBytes(vapidPublic)
          });
        }
        try {
          await api("POST", {action: "subscribe", token, subscription: subscription.toJSON()});
        } catch (e) {
          // Évite une autorisation locale active qui n'enverrait aucune notification.
          await subscription.unsubscribe();
          throw e;
        }
        pushOn = true;
        pushMessage("✅ Tu recevras les surenchères sur ton téléphone. MANU te remercie ! 😂");
      }
    } catch (e) {
      pushMessage("Impossible d'activer les alertes : " + (e.message || "erreur navigateur"));
    } finally {
      pushBusy = false;
      reflectPushButton();
    }
  });
  reflectPushButton();
  updatePushState();

  const render = (data) => {
    if (!data || !Number.isSafeInteger(data.current_bid)) return;
    const changed = previousBid >= 0 && data.current_bid > previousBid;
    if (changed && !busy) announceNewBid(data);
    if (typeof data.vapid_public === "string") vapidPublic = data.vapid_public;
    currentBid = data.current_bid;
    previousBid = data.current_bid;
    closed = data.status !== "open";
    lastTimestamp = data.bid_count ? data.updated_at : null;
    els.current.innerHTML = euro.format(Math.max(1, currentBid)) + ' <small>€</small>';
    els.heading.textContent = currentBid > 0 ? "MEILLEURE OFFRE ACTUELLE" : "MISE À PRIX";
    els.leader.textContent = currentBid ? (data.leader + " mène la danse !") : "Personne n'a encore osé !";
    els.bidsCount.textContent = euro.format(data.bid_count || 0);
    els.playersCount.textContent = euro.format(data.participant_count || 0);
    els.lastBid.textContent = relativeTime(lastTimestamp);
    els.submit.disabled = busy || closed || currentBid >= 99999;
    els.submit.textContent = closed ? "🔒 ENCHÈRES CLÔTURÉES" : "🔨 J'ENCHÉRIS !";
    els.amount.disabled = closed;
    setInputMin();
    els.list.replaceChildren();
    if (!Array.isArray(data.recent) || data.recent.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-list"; li.textContent = "Les enchères démarrent à 1 €… qui ose ?";
      els.list.append(li);
    } else {
      data.recent.forEach((bid, i) => {
        const li = document.createElement("li");
        const left = document.createElement("span");
        left.className = "history-name";
        left.textContent = (i === 0 ? "👑 " : "✦ ") + bid.nickname;
        const small = document.createElement("span");
        small.className = "history-detail";
        small.textContent = relativeTime(bid.created_at);
        left.append(small);
        const amount = document.createElement("span");
        amount.className = "history-amount";
        amount.textContent = money(bid.amount);
        li.append(left, amount); els.list.append(li);
      });
    }
    if (changed && dataLoaded && !busy) {
      els.current.animate([
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.14)", filter: "brightness(1.55)" },
        { transform: "scale(1)", filter: "brightness(1)" }
      ], { duration: 650, easing: "ease-out" });
    }
    // Annonce d'état public pour le module Flash Info : aucun appel API supplémentaire.
    window.dispatchEvent(new CustomEvent("manu:auction-update", {
      detail: {
        current_bid: currentBid,
        leader: String(data.leader || ""),
        bid_count: Number(data.bid_count) || 0,
        participant_count: Number(data.participant_count) || 0,
        status: String(data.status || "open"),
        updated_at: data.updated_at || null
      }
    }));
    dataLoaded = true;
  };
  const refresh = async () => {
    if (busy || requestPending || document.visibilityState === "hidden") return;
    requestPending = true;
    try {
      render(await api("GET"));
      setConnection(true);
    } catch (err) {
      setConnection(false);
      if (!dataLoaded) setFeedback("Impossible de joindre la salle des enchères. Nouvelle tentative automatique.", "error");
    } finally { requestPending = false; }
  };
  const confetti = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#f8de8a", "#ef315c", "#ffffff", "#f58e9e", "#a63c72"];
    for (let i = 0; i < 52; i++) {
      const part = document.createElement("i");
      part.className = "confetti-piece";
      part.style.setProperty("--left", (Math.random() * 100) + "vw");
      part.style.setProperty("--duration", (2.5 + Math.random() * 2.8) + "s");
      part.style.setProperty("--drift", ((Math.random() -.5) * 230) + "px");
      part.style.setProperty("--angle", (Math.random() * 360) + "deg");
      part.style.setProperty("--color", colors[i % colors.length]);
      els.confetti.append(part);
      setTimeout(() => part.remove(), 5700);
    }
  };
  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      if (closed) return;
      els.amount.value = String(Math.min(99999, currentBid + Number(button.dataset.add)));
      els.amount.focus();
    });
  });
  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || closed) return;
    const nickname = els.nickname.value.trim();
    const amount = Number(els.amount.value);
    if (nickname.length < 2 || nickname.length > 24) {
      setFeedback("Choisis un pseudo de 2 à 24 caractères.", "error"); return;
    }
    if (!Number.isSafeInteger(amount) || amount < freshMin() || amount > 99999) {
      setFeedback("Ta mise doit être supérieure à l'enchère actuelle.", "error"); setInputMin(); return;
    }
    busy = true;
    els.submit.disabled = true;
    els.submit.textContent = "⏳ LE COMMISSAIRE-PRISEUR VÉRIFIE…";
    safeStore.set("manu-auction-pseudo", nickname);
    setFeedback("Vérification de ton offre…");
    try {
      const result = await api("POST", { action: "bid", nickname, amount, token });
      render(result);
      setConnection(true);
      setFeedback("🔨 ADJUGÉ… enfin presque ! Tu mènes à " + money(amount) + " !", "success");
      confetti();
    } catch (err) {
      setFeedback(err.message || "Offre non enregistrée.", "error");
      setConnection(false);
      setTimeout(refresh, 500);
    } finally {
      busy = false;
      els.submit.disabled = closed || currentBid >= 99999;
      els.submit.textContent = closed ? "🔒 ENCHÈRES CLÔTURÉES" : "🔨 J'ENCHÉRIS !";
    }
  });
  byId("share").addEventListener("click", async () => {
    const url = location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: "QUI VEUT MANU ? 😂", text: "MANU est aux enchères pour rire ! Mise à prix 1 €. Viens surenchérir 😂", url });
      else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setFeedback("Lien copié ! Balance-le aux copains 😂", "success");
      } else {
        setFeedback("Copie ce lien dans la barre d'adresse : " + url, "info");
      }
    } catch (err) {
      if (err.name !== "AbortError") setFeedback("Impossible de partager automatiquement. Copie l'adresse de la page.", "error");
    }
  });
  const copyBrowserLink = document.getElementById("copy-browser-link");
  if (copyBrowserLink) copyBrowserLink.addEventListener("click", async () => {
    const freshLink = "https://cyberpunkg69-alt.github.io/supervilains-v3/enchere-manu/live.html";
    try {
      await navigator.clipboard.writeText(freshLink);
      const old = copyBrowserLink.textContent;
      copyBrowserLink.textContent = "✅ LIEN COPIÉ !";
      setTimeout(() => { copyBrowserLink.textContent = old; }, 2500);
    } catch {
      window.prompt("Copie ce lien et colle-le dans Chrome :", freshLink);
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
  window.addEventListener("online", refresh);
  setInterval(() => {
    if (lastTimestamp) els.lastBid.textContent = relativeTime(lastTimestamp);
    refresh();
  }, 3000);
  refresh();
})();