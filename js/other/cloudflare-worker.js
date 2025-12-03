export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---------- Embedded editor ----------
    if (path.startsWith("/embed")) {
      url.hostname = "embed.diagrams.net";
      url.protocol = "https:";
      url.pathname = path.replace(/^\/embed/, "");
      return fetch(new Request(url.toString(), request));
    }

    // ---------- Viewer ----------
    if (path.startsWith("/viewer")) {
      url.hostname = "viewer.diagrams.net";
      url.protocol = "https:";
      url.pathname = path.replace(/^\/viewer/, "");
      return fetch(new Request(url.toString(), request));
    }

    // ---------- Root editor (/ = app.diagrams.net) ----------
    // Alles dat NIET /embed of /viewer is komt hier
    url.hostname = "app.diagrams.net";
    url.protocol = "https:";
    // Let op: path niet strippen! app.diagrams.net verwacht dezelfde paden
    return fetch(new Request(url.toString(), request));
  }
};