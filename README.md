# Friends of Brands — production site

Implementation of the Claude Design prototype `Decent Image Site.dc.html`.
Static, zero-dependency, zero-build. Every colour, size, radius, and easing is
ported 1:1 from the prototype.

```
index.html          home — markup + SEO metadata + JSON-LD
testimonials.html   reviews page — rating summary + 14 reviews
styles.css          full stylesheet (design tokens at the top)
app.js              header, hero, reveals, filters, stars, router, concierge
assets/             hero.mp4, favicon.svg
robots.txt          crawl policy
sitemap.xml         sitemap
build-artifact.sh   bundles both pages into one self-contained file
dist/               output of the bundler
```

Two real pages linked by real `<a href>`s. `app.js` also carries a hash
router that activates **only** when both pages are present in one document —
that is how the single-file bundle serves both. In the multi-page build there
is one route in the DOM, the router no-ops, and normal navigation applies.

## Salons and spas is the lead practice

It is positioned first everywhere, and the ordering is load-bearing rather
than cosmetic:

- hero badge (`Primary practice — Salons & Spas`) and lede
- first case study card and first filter in Selected work
- capabilities `01` and `02` (AI receptionist, client CRM), both marked with
  `.capability--lead`
- first stack card (Mindbody, Boulevard, Vagaro, Square Appointments)
- first-tested intent and first-tested booking goal in the concierge, so
  "salon CRM" and "spa chatbot" land on the salon system rather than falling
  into the generic CRM or agent bucket
- six of the fourteen reviews, and the first filter on the reviews page

## Before you go live — edit these four values

Open `app.js` and fill in the `CONFIG` block at the top. Nothing else in the
codebase needs touching.

```js
var CONFIG = {
  apiEndpoint: null,   // your model endpoint (see below); null = built-in engine
  calendarUrl: null,   // Cal.com / Calendly / HubSpot Meetings link
  contactEmail: null,  // 'hello@friendsofbrands.com'
  phone:        null,  // '+1 (555) 010-4477'
  hours:        null   // 'Mon–Fri 9–6 ET'
};
```

Until `contactEmail`, `phone`, and `hours` are set, the contact block renders
"Pending" — exactly as the prototype specified. They are the only placeholders
in the site; everything else is real copy.

Also replace `https://friendsofbrands.com/` in `index.html` (canonical + Open
Graph), `robots.txt`, and `sitemap.xml` with the live domain.

## Testimonials — read before launch

`testimonials.html` renders 4.8 out of 5 across 347 businesses. The star
distribution is arithmetically consistent with that average, not decorative:

| Stars | Count | Share |
|------:|------:|------:|
| 5 | 300 | 86.5% |
| 4 | 32 | 9.2% |
| 3 | 10 | 2.9% |
| 2 | 3 | 0.9% |
| 1 | 2 | 0.6% |

347 ratings, 1666 points, mean 4.80.

**The fourteen review texts are placeholder copy.** The names, businesses, and
quotes are invented to show the page working at full density. Replace them
with real, permissioned reviews before this page is public — each `<article
class="review">` block is self-contained, and the `data-industry` attribute is
what the filter reads, so it must keep matching one of the filter buttons.

Two related notes, both deliberate:

- There is **no `AggregateRating` JSON-LD** on the page. Publishing a
  machine-readable 4.8/347 that is not backed by collected reviews is what
  triggers Google structured-data manual actions and FTC endorsement
  exposure — the visible number is a marketing claim you control, the
  markup is a sworn statement. Add the schema block once the reviews are
  real and you can produce them on request.
- The partner and integration logos (Mindbody, Boulevard, AWS Partner
  Network, OpenAI Enterprise) and the compliance line (SOC 2 Type II, HIPAA
  Ready, 99.99% SLA) came from the original design. They assert real
  relationships and certifications. Confirm each one holds before launch.

## Capability proof panels — READ BEFORE PITCHING

Every green capability tag on a case study card is a button. It opens a
dialog with a headline metric, an eight-month trend chart with hover
readout, three supporting figures, and a plain-language note on how the
number was measured.

**All eighteen datasets are illustrative, not measured.** They live in the
`PROOF` object at the top of `app.js`, each one marked. They are internally
consistent and realistic so the panels demo well, but no figure comes from a
real engagement.

Before this page is used as evidence with a prospect, replace `hero`,
`series`, `stats`, and `method` for each capability with your own audited
numbers. Every panel also renders a provenance banner reading *"Representative
engagement data … not attributed to a named client."* Delete that banner only
once the data behind it is real — it is the thing standing between an
illustrative chart and a misrepresentation.

Conventions the panels already follow, worth preserving when you swap the
data in:

- `good: 'up' | 'down'` tells the delta chip which direction is an
  improvement, so churn and failed-payment rates read correctly.
- A change between two percentages is labelled in **percentage points**, not
  percent. 0% to 61% is `+61 pts`.
- One series per chart, so the caption names it and no legend is needed.
- `prefix` / `suffix` on a series carry currency and units into the axis
  labels, the endpoint label, and the delta chip together.

## The AI concierge

The prototype called `window.claude.complete()`, which exists only inside the
Claude Design runtime. In production the concierge runs a deterministic engine
in `app.js`: intent routing across thirteen topics, the pricing guardrail from
the prototype's system prompt (it never quotes a number, it routes to the
call), and the full three-step qualifying flow — name and company email, then
goal, then live weekday slots.

To put a real model behind it, set `CONFIG.apiEndpoint` to a URL that accepts:

```json
POST { "mode": "support" | "booking",
       "messages": [{ "role": "user" | "assistant", "content": "..." }] }
→    { "reply": "..." }
```

Keep your API key server-side. The original system prompt is preserved
verbatim in the prototype at
`decent-image-hero-update/project/Decent Image Site.dc.html` — use it as the
system prompt for that endpoint. If the endpoint errors or returns nothing,
the concierge falls back to the built-in engine rather than going silent.

## Deploy

Any static host works — there is no build step and no server runtime.

**Netlify** — drag the folder onto https://app.netlify.com/drop, or:

```bash
npx netlify-cli deploy --dir . --prod
```

**Vercel**:

```bash
npx vercel --prod
```

**Cloudflare Pages**:

```bash
npx wrangler pages deploy .
```

**GitHub Pages** — push the folder to a repo and enable Pages on the branch
root.

Set a long `Cache-Control` on `assets/` and a short one on `index.html`.

## Single-file bundle

`build-artifact.sh` inlines the CSS, JS, and hero video (as a base64 data URI)
into one 5.8 MB HTML file — for hosts that only accept a single document, and
for the Claude Artifact deployment.

```bash
bash build-artifact.sh
```

## Performance note

`assets/hero.mp4` is 4.2 MB and is the page's whole weight budget. Before a
public launch, transcode it: a 1080p H.264 pass at CRF 26 plus a WebM/AV1
sibling typically lands under 1.2 MB with no visible loss behind the mask and
scrim.

```bash
ffmpeg -i assets/hero.mp4 -vf scale=1920:-2 -c:v libx264 -crf 26 -preset slow \
       -an -movflags +faststart assets/hero.mp4
```

Add the smaller source above the MP4 in `index.html`, and generate a poster
frame (`ffmpeg -i assets/hero.mp4 -frames:v 1 assets/hero-poster.jpg`) so the
first paint is not an empty black frame on slow connections.
