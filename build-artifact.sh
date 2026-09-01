#!/usr/bin/env bash
# Bundles the two-page site into a single self-contained document for the
# Claude Artifact host (strict CSP: no external requests except Google Fonts,
# so the hero video is inlined as a data URI).
#
# Both pages ship as sibling `.route` divs and app.js's hash router switches
# between them — index.html keeps the shared header, footer, and concierge,
# and only the <main> of testimonials.html is carried over.
set -euo pipefail
cd "$(dirname "$0")"

OUT="${1:-dist/decent-image-artifact.html}"
mkdir -p "$(dirname "$OUT")"

echo "base64-encoding hero video…" >&2
base64 -w0 assets/hero.mp4 > .hero.b64

# The testimonials route, with its duplicate #main id renamed.
sed -n '/^  <div class="route" data-route="testimonials">/,/^  <\/div>$/p' testimonials.html \
  | sed 's/id="main"/id="main-testimonials"/' > .route-testimonials.html

{
  printf '<title>Friends of Brands</title>\n'
  printf '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
  printf '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
  printf '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&amp;family=Inter:wght@300;400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">\n'
  printf '<style>\n'
  cat styles.css
  printf '\n</style>\n'

  # index.html's body, with the testimonials route spliced in before the
  # shared footer and every cross-page link rewritten to a hash route.
  sed -n '/^<body>/,/^<\/body>/p' index.html \
    | sed '1d;$d' \
    | grep -v 'src="app.js"' \
    | awk '/^  <footer class="site-footer">/ && !done {
             while ((getline line < ".route-testimonials.html") > 0) print line
             close(".route-testimonials.html"); done = 1
           }
           { print }' \
    | sed -e 's|href="testimonials\.html"|href="#/testimonials"|g' \
          -e 's|href="index\.html#|href="#|g' \
          -e 's|href="index\.html"|href="#/"|g' \
    | sed 's#<source src="assets/hero.mp4" type="video/mp4">#<source src="data:video/mp4;base64,@@HERO@@" type="video/mp4">#'

  printf '<script>\n'
  cat app.js
  printf '\n</script>\n'
} > "$OUT.tmp"

# Splice the base64 payload in without loading it through a shell variable.
awk -v b64file=".hero.b64" '
  /@@HERO@@/ {
    idx = index($0, "@@HERO@@")
    printf "%s", substr($0, 1, idx - 1)
    while ((getline line < b64file) > 0) printf "%s", line
    close(b64file)
    print substr($0, idx + 8)
    next
  }
  { print }
' "$OUT.tmp" > "$OUT"

rm -f "$OUT.tmp" .hero.b64 .route-testimonials.html
echo "wrote $OUT ($(wc -c < "$OUT") bytes)" >&2
