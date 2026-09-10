# Yongming Liang — academic website

A static academic website with a Three.js homepage:

- `/`: Cosmic Traveler-inspired dark design with a Three.js cosmic-web scene, drag/keyboard orbit, pause/reset, and reduced-motion handling. All academic content remains ordinary HTML.
- `/space/`: compatibility redirect to `/`, preserving query strings and fragments when JavaScript is available. The conventional homepage and version switch have been removed.
- `/publications/`: dedicated publication browser.
- `/talks/`: dedicated presentation archive.
- `/proposals/`: compatibility redirect to the compact telescope summary at `/#proposals`. Proposals have no detailed public list or year controls. The publication and talk reading pages retain their bounded year panels.
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

For year-navigation regression checks against a running preview, use `npm run test:browser`. Set `TEST_BASE_URL` to test another preview URL; `PLAYWRIGHT_EXECUTABLE_PATH` can select an installed browser. The suite exercises software-rendered WebGL, reduced-motion pause, keyboard orbit/reset, first-screen portrait placement, career order, real year controls, independent publication/talk states, all 58 presentation entries, 14 telescope totals, the legacy proposal redirect, enlarged CV portrait, funding placement, and mobile bounds. `TEST_BUILT_OUTPUT=1` starts a temporary server for `dist/`; `QA_OUTPUT_DIR` optionally saves telescope-summary screenshots.

The PDF renderer supports `PLAYWRIGHT_EXECUTABLE_PATH` for an already installed Chrome executable. It launches a fresh temporary browser context and does not access a personal browser profile. Generated PDF and its content fingerprint are saved to both `public/files/` and `dist/files/`.

## Content and ordering

Maintain `src/data/academic.json`. The homepage, separate publication page, and CV use it. All **38 papers/preprints** are ordered by their ADS publication month, newest first, preserving ADS result order for ties. First-author and coauthor papers are mixed. Journal/preprint status is a label, not a sorting priority. Proposals and conference abstracts are excluded from the paper list.

Dates have month precision; they do not claim exact day-level order. Authorship labels currently use the first named author followed by “et al.”; the linked ADS record provides full author order. No corresponding-author markers are inferred.

Research prose lives in `src/data/research.mjs`; each section cites stable bibliography IDs. The homepage summaries and detail pages share this data. Reference metadata is resolved from `academic.json`, and a missing reference fails the build. Talks are maintained in `src/data/talks.json`; news remains in its Astro component. The 58 presentation records span 2018–2026, including talks, seminars, invited tutorials, posters, and flash talks. The archive preserves month-only dates when exact presentation dates are unavailable, and uses the event name for four records with missing titles. Entries with unknown days follow dated entries in the same month; their relative day order is not claimed. Poster and flash presentations of the same contribution are counted once. No private source records are included in this repository. Rebuild the PDF after changing the shared academic data or CV page. The GitHub workflow regenerates it automatically.

The public observing summary lives in `src/data/observing-summary.json`: **14 telescope rows**, split into PI and Co-I/collaborator columns. Individual proposal records are maintained separately in a local archive; titles, proposal IDs, teams, and detailed sources are not included in the current public data. The same compact table appears on the homepage and in the HTML/PDF CV. `src/lib/proposals.mjs` provides a pure aggregation helper for preparing updated summaries without making the private archive a build dependency.

Known semester allocations are added within each telescope, role, unit, and time basis. Repeat semester awards are included; these are not unique executed-time totals. The table follows broad wavelength groups: Chandra first, then optical/infrared facilities, submillimeter/millimeter facilities, and radio facilities. Rounded display totals retain Chandra kiloseconds and Hubble orbits; a half-night award is written as ½ night. Raw aggregate precision and time bases remain intact. NOEMA has 10 h of PI time. Roman is shown as 1 Analysis program; an approved program without known hours is counted in programs. Per the public presentation preference, Grade C, observed/unquantified, wavelength-order, rounding, and date-completeness notes are omitted from the rendered pages. The underlying time bases remain unchanged in the aggregate data. Gemini North is omitted from the public summary while its source record remains in the local archive. No cross-telescope total is calculated.

Chandra Cycle 27's approved **US$61,320 total U.S. observing grant, including Co-I grants**, appears in Research funding on the homepage and CV. Liang is science PI; **Martin Elvis (CfA)** is U.S. administrative PI; his affiliation is listed in the [CfA profile](https://www.cfa.harvard.edu/people/martin-elvis). This is associated U.S. support, not Liang's directly administered cash funding. The wording follows the [Cycle 27 call, sections 3.1.2 and 10.2](https://cxc.harvard.edu/proposer/CfP/arc_pdfs/CfP_cyc27.pdf). Rebuild the PDF after editing the summary; `cv-manifest.json` fingerprints both academic and aggregate observing data, and the output checker rejects stale fingerprints. The CV uses the larger suit portrait (130 CSS pixels / approximately 34 mm in print). Its 10-page PDF places funding on page 1, the telescope summary and professional service on page 2, and the bibliography on pages 3–10.

`ProfessionalService.astro` shares service and membership content between the homepage and CV. The journal list in `academic.json` includes Astronomy & Astrophysics, The Astrophysical Journal, and Nature Astronomy, based on local review records. No manuscript identities, reports, review counts, or editorial correspondence are published.

The homepage and dedicated publication/talk pages show one year at a time in fixed-height scrollable panels. Newer/Older buttons stop at the newest/oldest available year; the year selector supports direct jumps. The latest year opens by default; fragments `#year-2024` and `#talk-year-2024` restore the corresponding catalog year. Both controls operate independently through `YearBrowser.astro` and `year-browser.js`. Changing years resets the inner scroll without jumping the surrounding page. Native controls and a live status message support keyboard and assistive technology. All years remain readable without JavaScript, and print styles expand them. The telescope summary has no pagination or client script. The CV contains the compact summary and continuous bibliography.

## 3D scene

`src/lib/cosmic-field.mjs` generates a deterministic illustrative cosmic web. It is **not an observational map or a scientific simulation output**. The scene uses narrow blue gas filaments, compact gold galaxy nodes and brighter pink quasar nodes across the full hero background. Sharper particle cores, clearer filament lines, antialiasing, and a device-pixel-ratio cap of 2 improve definition; the title overlay is lighter and the profile panel supplies its own readable background. The scene uses bounded point counts, lower density on small screens, and pauses outside the viewport or when the tab is hidden. Reduced motion starts paused. Touch scrolling is preserved; mouse drag and keyboard arrows provide orbit controls. Without JavaScript or WebGL, all content remains accessible and the background falls back to a static treatment.

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

The homepage opens with the full-square Alps selfie and identity/contact panel to the right of the title (stacked below the title on mobile). The separate About section holds the biography. The CV/appointments/education section comes before Publications; navigation and section numbers follow that order. The 3D page uses the Alps selfie explicitly supplied by the user; the CV uses the user-selected blue-background suit portrait (`yongming-liang-suit.jpg`). Public copies have personal metadata removed, with identical decoded pixels and preserved color profiles where present. Original files remain unchanged. No private slide decks, job-application CV PDFs, science catalogs, reviewer reports, or original proposal documents are included. Only aggregated telescope totals and the brief funding attribution are published. Talks link to public event information where verified; slide downloads can be added after selecting the exact public versions.

See `ASSETS.md` for asset provenance.
