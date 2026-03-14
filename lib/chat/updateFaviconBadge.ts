let defaultFaviconHref: string | null = null;
let currentObjectUrl: string | null = null;

function getFaviconElement(): HTMLLinkElement | null {
  return document.querySelector('link[rel~="icon"]');
}

function cleanupObjectUrl() {
  if (!currentObjectUrl) return;

  URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
}

function setFaviconHref(href: string) {
  const favicon = getFaviconElement();
  if (!favicon) return;

  favicon.href = href;
}

function getBadgeLabel(count: number): string {
  if (count > 9) return "9+";
  return String(Math.max(1, Math.floor(count)));
}

export function updateFaviconBadge(count: number) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const favicon = getFaviconElement();
  if (!favicon) return;

  if (!defaultFaviconHref) {
    defaultFaviconHref = favicon.href;
  }

  if (count <= 0) {
    cleanupObjectUrl();
    if (defaultFaviconHref) {
      setFaviconHref(defaultFaviconHref);
    }
    return;
  }

  const baseHref = defaultFaviconHref ?? favicon.href;
  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    const size = Math.max(image.width, image.height, 64);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(image, 0, 0, size, size);

    const badgeRadius = size * 0.28;
    const cx = size - badgeRadius;
    const cy = badgeRadius;

    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
    context.fill();

    const label = getBadgeLabel(count);
    context.fillStyle = "#ffffff";
    context.font = `bold ${Math.round(size * 0.3)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, cx, cy + size * 0.01);

    canvas.toBlob((blob) => {
      if (!blob) return;

      cleanupObjectUrl();
      currentObjectUrl = URL.createObjectURL(blob);
      setFaviconHref(currentObjectUrl);
    }, "image/png");
  };

  image.src = baseHref;
}
