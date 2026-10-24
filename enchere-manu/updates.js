"use strict";
(() => {
  const root = document.getElementById("manu-updates-details");
  const list = document.getElementById("updates-list");
  const summary = document.getElementById("updates-headline");
  const dateEl = document.getElementById("updates-date");
  const foot = document.getElementById("updates-footnote");
  if (!root || !list || !summary || !dateEl || !foot) return;

  // Historique public GitHub : uniquement les changements du dossier des enchères.
  const API = "https://api.github.com/repos/cyberpunkg69-alt/supervilains-v3/commits?path=enchere-manu&per_page=35";
  const REPO = "https://github.com/cyberpunkg69-alt/supervilains-v3/commit/";
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris"
  });
  const formatDate = v => {
    const date = new Date(v);
    return Number.isNaN(date.getTime()) ? "" : formatter.format(date);
  };
  const classify = message => {
    const m = message.toLowerCase();
    if (/changelog|release.?notes|latest.?updates|update.?widget|nouv[eé]aut[eé]s/.test(m)) {
      return { key: "updates", title: "✨ Nouveau : le widget des mises à jour" };
    }
    if (/flash.?info|breaking.?news|news.?ticker|100 satirical|bulletin/.test(m)) {
      return { key: "flash", title: "📺 Flash Info MANU : 100 alertes, annonces contextuelles" };
    }
    if (/react|réaction|reaction|5.reactions|leaderboard|comment.*top/.test(m)) {
      return { key: "reactions", title: "❤️ Réactions aux commentaires et Flash Info dès 5 votes" };
    }
    if (/\bvoice|vocal|audio|microphone|record/.test(m)) {
      return { key: "voice", title: "🎙️ Messages vocaux de 15 secondes dans le chat" };
    }
    if (/\bgif|giphy|tenor/.test(m)) {
      return { key: "gif", title: "🎞️ GIF animés : recherche, partage et envoi dans le chat" };
    }
    if (/iphone|ipad|ios|home.screen|apple|web.app/.test(m)) {
      return { key: "ios", title: "🍎 Notifications et application sur iPhone / iPad" };
    }
    if (/chat|emoji|message|discussion/.test(m)) {
      return { key: "chat", title: "💬 Chat sans inscription, photos et emojis" };
    }
    if (/notif|push|alert|vapid/.test(m)) {
      return { key: "push", title: "🔔 Notifications des surenchères sur Android" };
    }
    if (/poster|portrait|photo|image|affiche/.test(m)) {
      return { key: "poster", title: "👑 Affiche cabaret de MANU actualisée" };
    }
    if (/chrome|browser|cache/.test(m)) {
      return { key: "chrome", title: "🌐 Ouverture sur Chrome et corrections d’affichage" };
    }
    return null;
  };
  const extract = commits => {
    const seen = new Set();
    const entries = [];
    for (const record of commits) {
      if (!record || !/^[a-f0-9]{40}$/.test(String(record.sha || ""))) continue;
      const message = String(record.commit?.message || "").split("\n")[0].trim();
      const match = message.match(/^(feat|fix|ui|perf|refactor)(?:\([^)]+\))?:\s*(.+)$/i);
      if (!match) continue; // Masquer les commits purement techniques (docs, CSS, sync).
      const category = classify(match[2]);
      const title = category?.title || ((match[1] === "fix" ? "🔧 Correctif : " : "✨ ") + match[2]);
      const key = category?.key || record.sha;
      if (seen.has(key)) continue;
      const date = record.commit?.committer?.date || record.commit?.author?.date;
      if (!formatDate(date)) continue;
      seen.add(key);
      entries.push({ title: title.slice(0, 165), date, sha: record.sha });
      if (entries.length >= 5) break;
    }
    return entries;
  };
  const render = entries => {
    if (!entries.length) return;
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const li = document.createElement("li");
      const info = document.createElement("span");
      info.className = "updates-item-info";
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const date = document.createElement("small");
      date.textContent = formatDate(entry.date);
      const a = document.createElement("a");
      a.href = REPO + entry.sha;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Détails ↗";
      a.setAttribute("aria-label", "Voir la mise à jour GitHub : " + entry.title);
      info.append(title, date);
      li.append(info, a);
      fragment.append(li);
    }
    list.replaceChildren(fragment);
    summary.textContent = entries[0].title;
    dateEl.textContent = formatDate(entries[0].date);
  };
  async function refresh() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    try {
      const res = await fetch(API, {
        cache: "no-store", signal: controller.signal,
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!res.ok) throw new Error("Historique temporairement indisponible");
      const commits = await res.json();
      if (!Array.isArray(commits)) throw new Error("Réponse GitHub inattendue");
      const entries = extract(commits);
      if (!entries.length) return;
      render(entries);
      foot.textContent = "Nouveautés récupérées automatiquement depuis les modifications GitHub.";
    } catch {
      // Les dernières nouveautés intégrées au site restent consultables hors connexion.
      foot.textContent = "Dernières nouveautés connues. Actualisation automatique temporairement indisponible.";
    } finally {
      clearTimeout(timer);
    }
  }
  refresh();
  // Réactualisation modérée pour éviter la limite des requêtes GitHub.
  let lastLoad = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastLoad > 10 * 60 * 1000) {
      lastLoad = Date.now();
      refresh();
    }
  });
})();
