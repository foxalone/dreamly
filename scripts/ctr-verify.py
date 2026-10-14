#!/usr/bin/env python3
"""Snapshot Google-facing metadata + visible H1 of the CTR-experiment pages on production.
usage: ctr-verify.py snapshot <outdir> | ctr-verify.py compare <beforedir> <afterdir>"""
import html, json, os, re, sys, urllib.request

TEST = ["/dreams/work", "/dreams/elephant-chasing-you", "/dreams/luxury-hotel", "/dreams/flying", "/dreams/falling-off-building",
        "/dreams/tunnel", "/dreams/white-elephant", "/dreams/being-ignored", "/dreams/goat-attack", "/dreams/friendly-lion",
        "/es/dreams/heights", "/es/dreams/deer", "/es/dreams/tsunami-and-family", "/es/dreams/debt", "/es/dreams/earthquake-at-home",
        "/es/dreams/arguing-with-mother", "/es/dreams/escaping-prison", "/de/dreams/miscarriage", "/de/dreams/funeral", "/de/dreams/goat",
        "/ru/dreams/wedding-and-death", "/ru/dreams/arguing-with-father", "/ru/dreams/stag-with-antlers", "/ru/dreams/dead-cat",
        "/ru/dreams/losing-money", "/pt/dreams/big-fish", "/pt/dreams/colorful-fish"]
CONTROL = ["/de/dreams/train-station", "/es/dreams/thunder-and-lightning", "/pt/dreams/baby-tiger", "/ru/dreams/new-car", "/de/dreams/hotel",
           "/dreams/tsunami-and-family", "/dreams/turbulence-on-plane", "/dreams/black-lion", "/dreams/hotel", "/dreams/snake"]
SITE = "https://dreamly.art"

def fetch(path):
    req = urllib.request.Request(SITE + path, headers={"User-Agent": "Mozilla/5.0 (ctr-verify)", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8", "replace"), dict(r.headers)

def attr(page, pattern):
    m = re.search(pattern, page, re.S)
    return html.unescape(m.group(1)).strip() if m else None

def extract(page):
    head = page.split("</head>", 1)[0]
    body = page.split("</head>", 1)[1] if "</head>" in page else page
    return {
        "title": attr(head, r"<title>(.*?)</title>"),
        "description": attr(head, r'<meta name="description" content="(.*?)"'),
        "og:title": attr(head, r'<meta property="og:title" content="(.*?)"'),
        "og:description": attr(head, r'<meta property="og:description" content="(.*?)"'),
        "twitter:title": attr(head, r'<meta name="twitter:title" content="(.*?)"'),
        "canonical": attr(head, r'<link rel="canonical" href="(.*?)"'),
        "hreflang": sorted(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', head)),
        "robots": attr(head, r'<meta name="robots" content="(.*?)"'),
        "h1": re.sub(r"<[^>]+>", "", attr(body, r"<h1[^>]*>(.*?)</h1>") or ""),
        "jsonld_count": body.count('application/ld+json'),
        "jsonld_article_desc": attr(body, r'"@type":"Article".*?"description":"(.*?)"'),
        "body_sha": __import__("hashlib").sha256(re.sub(r'<script[^>]*>.*?</script>|nonce="[^"]*"|data-precedence="[^"]*"', "", body, flags=re.S).encode()).hexdigest()[:16],
    }

def snapshot(outdir):
    os.makedirs(outdir, exist_ok=True)
    out = {}
    for path in TEST + CONTROL:
        try:
            status, page, headers = fetch(path)
            out[path] = {"status": status, "x-vercel-id": headers.get("x-vercel-id"), "age": headers.get("Age"), **extract(page)}
        except Exception as e:
            out[path] = {"error": str(e)}
        print(f"{path}: {out[path].get('status')} | {out[path].get('title')}")
    json.dump(out, open(os.path.join(outdir, "snapshot.json"), "w"), ensure_ascii=False, indent=1)

def compare(before, after):
    b = json.load(open(os.path.join(before, "snapshot.json"))); a = json.load(open(os.path.join(after, "snapshot.json")))
    ok = True
    print("\n=== TEST pages (expect: title+description changed; everything else identical) ===")
    for p in TEST:
        x, y = b[p], a[p]
        changed = [k for k in x if x.get(k) != y.get(k) and k not in ("x-vercel-id", "age")]
        extra = [k for k in changed if k not in ("title", "description")]
        good = "title" in changed and "description" in changed and not extra
        ok &= good
        print(f"{'OK ' if good else 'BAD'} {p}\n     title: {x.get('title')}\n        -> {y.get('title')}" + (f"\n     UNEXPECTED also changed: {extra}" if extra else ""))
    print("\n=== CONTROL pages (expect: identical) ===")
    for p in CONTROL:
        x, y = b[p], a[p]
        changed = [k for k in x if x.get(k) != y.get(k) and k not in ("x-vercel-id", "age")]
        ok &= not changed
        print(f"{'OK ' if not changed else 'BAD'} {p}: {y.get('title')}" + (f"  CHANGED: {changed}" if changed else ""))
    print("\nRESULT:", "ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED")
    return ok

if __name__ == "__main__":
    if sys.argv[1] == "snapshot": snapshot(sys.argv[2])
    else: sys.exit(0 if compare(sys.argv[2], sys.argv[3]) else 1)
