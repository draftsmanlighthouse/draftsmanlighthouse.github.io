export default {
  async fetch(request) {

    const originalUrl = new URL(request.url);
    let path = originalUrl.pathname;

    // ---------------------------------------------------------
    // Detecteer of de Worker draait onder /diagram/*
    // ---------------------------------------------------------
    // Scenario 1: diagram.bohanssen.com   → path is /embed, /viewer, ...
    // Scenario 2: notebook.bohanssen.com  → path is /diagram/embed, /diagram/viewer, ...
    let isNested = false;

    if (path.startsWith("/diagram/")) {
      isNested = true;
      path = path.replace(/^\/diagram/, "");   // /diagram/embed → /embed
    }

    // ---------------------------------------------------------
    // Bepaal target URL
    // ---------------------------------------------------------
    // embed  → embed.diagrams.net
    // viewer → viewer.diagrams.net
    // alles → app.diagrams.net
    const target = new URL("https://app.diagrams.net"); // default fallthrough

    if (path.startsWith("/embed")) {
      target.hostname = "embed.diagrams.net";
      target.pathname = path.replace(/^\/embed/, "");   // strip "/embed"
    }
    else if (path.startsWith("/viewer")) {
      target.hostname = "viewer.diagrams.net";
      target.pathname = path.replace(/^\/viewer/, "");
    }
    else {
      // app.diagrams.net gebruikt dezelfde paden
      target.pathname = path;
    }

    // Query params kopiëren
    target.search = originalUrl.search;

    // ---------------------------------------------------------
    // Proxy de request
    // ---------------------------------------------------------
    return fetch(new Request(target.toString(), request));
  }
};