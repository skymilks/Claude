# Bathroom Renovation Landing Page

A single-page, mobile-first lead-gen landing page for a Thunder Bay bathroom
renovation business. Built with [Astro](https://astro.build) as a fully
static site (no CMS, no database), deployed to Cloudflare Pages.

## Before you launch: replace the placeholders

All brand/contact placeholders live in one file: [`src/config.ts`](src/config.ts).

| Placeholder        | Where it's used                                    |
| ------------------- | --------------------------------------------------- |
| `{{BRAND}}`         | Title tag, header, footer, JSON-LD, thank-you page  |
| `{{PHONE}}`         | Tap-to-call links in header/footer, JSON-LD         |
| `{{FORM_ENDPOINT}}` | Tally form embed URL                                |

Also replace the placeholder before/after images in `public/images/`
(`demo1_before.jpg` / `demo1_after.jpg`, `demo2_*`, `demo3_*`) with real
photos of the same filenames, and drop in the Meta Pixel base code where
marked `<!-- META PIXEL HERE -->` in `src/layouts/BaseLayout.astro`, then
uncomment the conversion snippet in `src/pages/thank-you.astro`.

The Tally form itself (fields, validation, and the "redirect to /thank-you
on submit" behavior) is configured in the Tally dashboard, not in this repo
— this project only embeds it.

## Development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs static site to dist/
npm run preview   # serve the production build locally
```

## Deploy to Cloudflare Pages

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name=<project-slug>
```

The first run creates the Cloudflare Pages project if it doesn't exist yet;
use the same command for every subsequent deploy.

## Project structure

- `src/config.ts` — single source of truth for brand/phone/form placeholders
- `src/layouts/BaseLayout.astro` — meta tags, LocalBusiness JSON-LD, Meta Pixel slot
- `src/components/` — page sections (Header, Hero, HowItWorks, Gallery, TrustStrip, TallyForm, Footer)
- `src/pages/index.astro` — the landing page
- `src/pages/thank-you.astro` — form redirect target + Pixel conversion slot
- `public/images/` — before/after photo placeholders
