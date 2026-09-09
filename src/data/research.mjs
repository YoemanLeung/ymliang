export const researchTopics = [
  {
    slug: 'galaxy-igm',
    number: '01',
    title: 'Galaxies & the cosmic web',
    subtitle: 'Connecting galaxies to the gas between them',
    summary: 'Mapping galaxies alongside intergalactic hydrogen to understand how large-scale environments connect to galaxy evolution at cosmic noon.',
    question: 'How does the distribution of intergalactic gas relate to where galaxies form and evolve?',
    introduction: 'My doctoral research centers on the relationship between galaxies and neutral hydrogen in the intergalactic medium (IGM) at redshift z ≈ 2. This connects the environments of individual galaxies to the much larger structures of the cosmic web.',
    sections: [
      {
        heading: 'Two complementary views of the same environment',
        text: 'Narrowband images from Subaru’s Hyper Suprime-Cam identify galaxies through their Lyα emission. Spectra of more distant quasars reveal intervening hydrogen through Lyα absorption. Comparing these observations lets us investigate the relationship between galaxy density and absorption by surrounding gas.',
        citations: ['2021ApJ...907....3L'],
      },
      {
        heading: 'From a published sample to a broader program',
        text: 'In a four-field study published in 2021, we found that Lyα-emitting galaxies preferentially cluster in regions with stronger hydrogen absorption on scales extending to several physical megaparsecs. This study is one published part of my broader doctoral-thesis program on the galaxy–IGM connection.',
        citations: ['2021ApJ...907....3L'],
      },
      {
        heading: 'Where quasars change the picture',
        text: 'The Cosmic Himalayas field shows that peaks in the distributions of quasars, galaxies, and hydrogen absorption need not coincide. Comparing such environments helps us investigate how matter density and radiation together shape the observable gas around galaxies.',
        citations: ['2025ApJ...986...60L'],
      },
    ],
  },
  {
    slug: 'cosmic-himalayas',
    number: '02',
    title: 'Quasars at the extremes',
    subtitle: 'The Cosmic Himalayas and the environments of black-hole growth',
    summary: 'The Cosmic Himalayas quasar concentration offers a window into the relationship between black-hole growth, galaxies, and surrounding gas.',
    question: 'What brings many quasars into an active state in the same region of the Universe?',
    introduction: 'Quasars are powered by accretion onto supermassive black holes. I study their environments by comparing the spatial distributions of quasars, galaxies, and intergalactic hydrogen, with a particular focus on the Cosmic Himalayas at z ≈ 2.2.',
    sections: [
      {
        heading: 'An extreme environment',
        text: 'Our 2025 study identified a concentration of 11 quasars at z = 2.16–2.20 in the BOSSJ0210 field. It was the highest quasar density peak identified within the study’s approximately 10,000-square-degree SDSS search. Subaru imaging and absorption in background-quasar spectra provided complementary maps of the surrounding galaxies and gas.',
        citations: ['2025ApJ...986...60L'],
      },
      {
        heading: 'Three tracers, different structures',
        text: 'The quasar concentration does not coincide with the peaks in galaxy density or hydrogen absorption. Instead, it lies near the boundary between more opaque and more transparent gas. These spatial differences motivate questions about black-hole fueling and ionizing radiation; the maps alone do not establish a causal feedback mechanism.',
        citations: ['2025ApJ...986...60L'],
      },
      {
        heading: 'Connecting observations with simulations',
        text: 'In a collaborative follow-up using the CROCODILE simulation, we examined how rare such quasar concentrations are. Accounting for the non-Gaussian distribution of overdensities reduces their apparent rarity and reconciles Cosmic Himalayas-like structures with the standard ΛCDM framework.',
        citations: ['2026ApJ..1001..172K'],
      },
    ],
  },
  {
    slug: 'high-redshift',
    number: '03',
    title: 'The high-redshift Universe',
    subtitle: 'Galaxy surveys across the era of cosmic reionization',
    summary: 'Wide-field surveys and spectroscopy reveal distant galaxy populations and help trace the evolution of hydrogen through cosmic reionization.',
    question: 'What can distant galaxies tell us about the changing state of hydrogen in the early Universe?',
    introduction: 'I contribute to collaborative surveys of distant galaxies, including SILVERRUSH studies using Subaru/HSC-SSP and CHORUS imaging. Large samples connect the properties of individual galaxies to the evolution of populations across cosmic time.',
    sections: [
      {
        heading: 'Building a wide view',
        text: 'SILVERRUSH XIII assembled a catalog of 20,567 Lyα-emitter candidates across redshift slices from z = 2.2 to 7.3. Narrowband imaging selects galaxies through excess emission in a particular wavelength range. Careful masking, checks of image quality, and spectroscopic comparisons help make the resulting samples useful for population studies.',
        citations: ['2023ApJS..268...24K'],
      },
      {
        heading: 'From galaxy counts to their environments',
        text: 'SILVERRUSH XIV used these survey data to measure the abundance of galaxies as a function of Lyα luminosity and their angular clustering. Together, these measurements connect the observed population to its dark-matter environments and provide a statistical view that complements detailed observations of individual objects.',
        citations: ['2025ApJS..277...37U'],
      },
      {
        heading: 'Probing reionization with Lyα',
        text: 'Neutral hydrogen scatters Lyα photons, so the visibility of distant Lyα emitters carries information about the gas between galaxies. Comparing luminosity functions and clustering with reionization models constrains the neutral fraction of the IGM. These inferences depend on models of galaxy emission and gas transmission, rather than providing a direct image of ionized regions.',
        citations: ['2025ApJS..277...37U'],
      },
    ],
  },
];
