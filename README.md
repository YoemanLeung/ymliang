# Yongming Liang — academic website

A static academic website with a Three.js homepage:

- `/`: Cosmic Traveler-inspired dark design with a Three.js cosmic-web scene, drag/keyboard orbit, pause/reset, and reduced-motion handling. All academic content remains ordinary HTML.
- `/space/`: compatibility redirect to `/`, preserving query strings and fragments when JavaScript is available. The conventional homepage and version switch have been removed.
- `/publications/`: dedicated publication browser.
- `/talks/`: dedicated presentation archive. Both reading pages use the same dark visual style and bounded year controls as the homepage.
- `/research/galaxy-igm/`, `/research/cosmic-himalayas/`, `/research/high-redshift/`: short research introductions with linked references at the bottom. Static HTML without client scripts or a WebGL dependency.
- `/cv/`: print-friendly full CV, also available as `files/yongming-liang-cv.pdf`.

Personal academic website of Yongming Liang. Hosted on GitHub Pages at [yoemanleung.github.io/ymliang/](https://yoemanleung.github.io/ymliang/).

## Run locally

Use Node **24 or newer** and npm **9.6.5 or newer**. The project pins Astro 7.3.2, Three.js 0.186.0, and Playwright 1.62.1. Ensure the current Node runtime is active before installing dependencies.

```sh
npm ci
npm run dev
```

Open the exact address printed by Astro (configured for `http://127.0.0.1:4321/`). Astro 7 may run its development server in the background; use `npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop` to manage it.

```sh
npm test
npm run build
npx playwright install chromium
npm run build:pdf
node scripts/check-output.mjs
```

For year-navigation regression checks against a running preview, use `npm run test:browser`. Set `TEST_BASE_URL` to test another preview URL; `PLAYWRIGHT_EXECUTABLE_PATH` can select an installed browser. The suite exercises real controls, independent publication/talk states, all 58 presentation entries, direct links, and mobile bounds.

The PDF renderer supports `PLAYWRIGHT_EXECUTABLE_PATH` for an already installed Chrome executable. It launches a fresh temporary browser context and does not access a personal browser profile. Generated PDF and its content fingerprint are saved to both `public/files/` and `dist/files/`.

## Content and ordering

Maintain `src/data/academic.json`. The homepage, separate publication page, and CV use it. All **38 papers/preprints** are ordered by their ADS publication month, newest first, preserving ADS result order for ties. First-author and coauthor papers are mixed. Journal/preprint status is a label, not a sorting priority. Proposals and conference abstracts are excluded from the paper list.

Dates have month precision; they do not claim exact day-level order. Authorship labels currently use the first named author followed by “et al.”; the linked ADS record provides full author order. No corresponding-author markers are inferred.

Research prose lives in `src/data/research.mjs`; each section cites stable bibliography IDs. The homepage summaries and detail pages share this data. Reference metadata is resolved from `academic.json`, and a missing reference fails the build. Talks are maintained in `src/data/talks.json`; news remains in its Astro component. The 58 presentation records span 2018–2026, including talks, seminars, invited tutorials, posters, and flash talks. The archive preserves month-only dates when exact presentation dates are unavailable, and uses the event name for four records with missing titles. Entries with unknown days follow dated entries in the same month; their relative day order is not claimed. Poster and flash presentations of the same contribution are counted once. No private source records are included in this repository. Rebuild the PDF after changing the shared academic data or CV page. The GitHub workflow regenerates it automatically.

The homepage and dedicated publication/talk pages show one year at a time in a fixed-height scrollable panel. Newer/Older buttons stop at the newest/oldest available year; the year selector supports direct jumps. The latest year opens by default; `#year-2024` links restore publication years; `#talk-year-2024` links restore presentation years. The two controls operate independently through the shared `YearBrowser.astro` component and `year-browser.js` script. Changing years resets the panel's scroll position without jumping the surrounding page. Native buttons/selects and a live status message support keyboard and assistive-technology use. With JavaScript unavailable, every year remains readable inside the bounded panel. Print styles expand all years; `/cv/` always renders the continuous bibliography without a pagination script.

## 3D scene

`src/lib/cosmic-field.mjs` generates a deterministic illustrative cosmic web. It is **not an observational map or a scientific simulation output**. The scene uses bounded point counts, lower density on small screens, capped pixel ratio, and pauses outside the viewport or when the tab is hidden. Reduced motion starts paused. Touch scrolling is preserved; mouse drag and keyboard arrows provide orbit controls. Without JavaScript or WebGL, all content remains accessible and the background falls back to a static treatment.

Only the 3D homepage imports Three.js. The publication and talk reading pages use only the small year-navigation script; research pages and the CV contain no client scripts. The production build reports a size warning for the Three.js bundle; this is isolated to the 3D route.

## GitHub Pages

Repository: `YoemanLeung/ymliang`. This directory is the repository root. Local research records are excluded from version control.

The included `.github/workflows/pages.yml` builds and publishes static output with Node 24. Select **GitHub Actions** as the Pages publishing source. The workflow uses GitHub's site origin and base path, so both a root user site and a project subpath are supported. It deploys on a main-branch push or manual run once installed in an enabled repository.

For a local project-subpath check:

```sh
SITE_URL=https://yoemanleung.github.io SITE_BASE=/ymliang/ npm run build
SITE_BASE=/ymliang/ npm run build:pdf
SITE_BASE=/ymliang/ node scripts/check-output.mjs
```

The root is the selected 3D homepage; old `/space/` links redirect there. The workflow derives the site origin and repository subpath from GitHub Pages.

## Assets and release scope

The 3D page uses the Alps selfie explicitly supplied by the user; the CV uses the user-selected blue-background suit portrait (`yongming-liang-suit.jpg`). Public copies have personal metadata removed, with identical decoded pixels and preserved color profiles where present. Original files remain unchanged. No private slide decks, job-application CV PDFs, science catalogs, or proposal results are included. Talks link to public event information where verified; slide downloads can be added after selecting the exact public versions.

See `ASSETS.md` for asset provenance.
