# Asset provenance

- `public/images/yongming-liang-alps.jpg`: photograph supplied and selected by Yongming Liang for this website. Displayed in its original square composition. Personal metadata is removed; decoded pixels and the Display P3 color profile are preserved.
- `public/images/yongming-liang-suit.jpg`: blue-background suit portrait selected by Yongming Liang for the CV. The supplied square composition and decoded pixels are preserved; personal metadata is removed.
- `public/favicon.svg`: geometric mark created for this website.
- `public/data/cosmic-web-*.bin`: derived from the public [Mini-Millennium galaxy catalogue](https://wwwmpa.mpa-garching.mpg.de/galform/agnpaper/). Credit: Virgo Consortium's Millennium simulation, computed at the Max Planck Society computing centre in Garching; galaxy modelling and public catalogue by Croton and collaborators. References: [Springel et al. (2005)](https://doi.org/10.1038/nature03597) and [Croton et al. (2006)](https://doi.org/10.1111/j.1365-2966.2005.09994.x). `public/data/cosmic-web.json` records the source URL, input/output checksums, binary format, and rendering interpretation. No simulation imagery is redistributed.
- Three.js and OrbitControls: MIT-licensed library. Its license is included in `public/licenses/three.txt`.

The portrait photographs are provided for display on this website; this repository does not grant a general reuse license for them. No original application CVs or presentation decks are included.

## Cosmic-web visualization

The catalogue contains 18,960 model galaxies at redshift zero in a periodic 62.5 Mpc/h box, with a magnitude-limited selection. The website preserves the three-dimensional positions and renders a softly bounded slab. Offline neighbourhood moments set the widths and directions of smooth ellipsoidal kernels; the browser projects these as Gaussian splats. No hand-drawn filaments or categorical gas/galaxy/quasar colours are used.

This is a decorative visualization of **galaxy tracers**, not a reconstruction of gas or dark-matter density, a hydrodynamical simulation, an observed map, or the COSMOS-Web survey. Kernel width, colour, opacity, cropping and display scale are visualization choices. The animation moves the view of one snapshot; it does not represent structure growth. The [Millennium density-slice gallery](https://wwwmpa.mpa-garching.mpg.de/galform/virgo/millennium/) and [IllustrisTNG media descriptions](https://www.tng-project.org/media/) informed the treatment of broad structures, voids and projection depth.

To reproduce the asset, download the documented ASCII archive and run:

```sh
python scripts/build-cosmic-field.py --source /path/to/croton_etal.ugriz.mini.ascii.tar.gz
```

The offline builder requires NumPy and SciPy. It checks the source checksum, computes periodic 16th-neighbour radii and regularized 32-neighbour covariance, and writes only quantized positions and smoothing moments. The source archive remains outside this repository. GitHub Pages builds use the precomputed asset and need no Python, simulation service, API key, or external data request. If regenerating it, remove any superseded binary after verifying the replacement; the filename includes its content hash.
