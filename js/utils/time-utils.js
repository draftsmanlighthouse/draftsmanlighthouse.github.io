function formatCreated(ts) {
  const now = Date.now();
  const diffMs = now - ts;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // ---- 1. Omslagpunt: na 7 dagen → normale datum ----
  if (diffDays >= 7) {
    return new Date(ts).toLocaleDateString("nl-NL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  // ---- 2. Relative formatting voor < 7 dagen ----
  const rtf = new Intl.RelativeTimeFormat("nl", { numeric: "auto" });
  const diffSec = diffMs / 1000;

  if (diffSec < 60)
    return rtf.format(-Math.round(diffSec), "second");

  const diffMin = diffSec / 60;
  if (diffMin < 60)
    return rtf.format(-Math.round(diffMin), "minute");

  const diffHour = diffMin / 60;
  if (diffHour < 24)
    return rtf.format(-Math.round(diffHour), "hour");

  const diffDay = diffHour / 24;
  return rtf.format(-Math.round(diffDay), "day");
}