const CORTEX_PROJECTS = [
  {
    lat: -3.47,
    lon: -62.22,
    title: "Amazon Rainforest Protection",
    description: "Protecting 2.7M acres of primary rainforest in the Brazilian Amazon through indigenous land rights and satellite monitoring.",
    link: "#",
    featured: true
  },
  {
    lat: -2.33,
    lon: 34.83,
    title: "Serengeti Wildlife Corridor",
    description: "Maintaining migration routes for 1.5M wildebeest and 250,000 zebra across Tanzania and Kenya through land-use agreements.",
    link: "#",
    featured: true
  },
  {
    lat: -18.29,
    lon: 147.70,
    title: "Great Barrier Reef Restoration",
    description: "Coral bleaching recovery program spanning 344,400 km² of reef ecosystem off the Queensland coast.",
    link: "#",
    featured: true
  },
  {
    lat: 1.0,
    lon: 114.0,
    title: "Heart of Borneo",
    description: "Transboundary conservation of 220,000 km² of tropical rainforest across Malaysia, Indonesia, and Brunei.",
    link: "#",
    featured: true
  },
  {
    lat: -0.2,
    lon: 25.0,
    title: "Congo Basin Forest Alliance",
    description: "Protecting the world's second-largest tropical forest, home to forest elephants, gorillas, and bonobos.",
    link: "#",
    featured: true
  },
  {
    lat: -18.0,
    lon: -57.0,
    title: "Pantanal Wetlands Initiative",
    description: "Restoring the world's largest tropical wetland spanning Brazil, Bolivia, and Paraguay after record fires.",
    link: "#",
    featured: true
  },
  {
    lat: 49.0,
    lon: -113.0,
    title: "Yellowstone to Yukon",
    description: "Connecting wilderness areas from Wyoming to Alaska to allow large carnivore populations to roam freely.",
    link: "#",
    featured: false
  },
  {
    lat: -18.77,
    lon: 46.87,
    title: "Madagascar Biodiversity Corridor",
    description: "Safeguarding lemur habitats and endemic plant species across fragmented forest patches in the highlands.",
    link: "#",
    featured: false
  },
  {
    lat: 28.0,
    lon: 84.0,
    title: "Himalayan Climate Corridor",
    description: "Enabling climate-driven species migration across Nepal, India, and Bhutan through connectivity planning.",
    link: "#",
    featured: false
  },
  {
    lat: 18.0,
    lon: -87.5,
    title: "Mesoamerican Reef System",
    description: "Protecting 1,000 km of reef stretching from Mexico to Honduras — the world's second-largest barrier reef.",
    link: "#",
    featured: false
  },
  {
    lat: 45.0,
    lon: 135.0,
    title: "Amur Tiger Habitat Recovery",
    description: "Expanding protected forest in Russia's Primorsky Krai to support critically endangered Amur tiger populations.",
    link: "#",
    featured: false
  },
  {
    lat: 15.0,
    lon: 2.0,
    title: "Sahel Great Green Wall",
    description: "Reforestation across 11 African nations to halt desertification and restore 100M hectares by 2030.",
    link: "#",
    featured: false
  },
  {
    lat: -50.0,
    lon: -73.0,
    title: "Patagonia Rewilding",
    description: "Reintroducing jaguar, huemul deer, and guanaco to restored grasslands in Argentine and Chilean Patagonia.",
    link: "#",
    featured: false
  },
  {
    lat: 12.5,
    lon: 105.0,
    title: "Mekong Freshwater Conservation",
    description: "Protecting the Mekong River's endemic fish species and wetland habitats across Southeast Asia.",
    link: "#",
    featured: false
  },
  {
    lat: 64.96,
    lon: -19.02,
    title: "Iceland Highland Restoration",
    description: "Revegetating eroded highland lava fields to recover soil carbon and native moss ecosystems at scale.",
    link: "#",
    featured: false
  },
  {
    lat: 65.0,
    lon: 26.0,
    title: "Nordic Peatland Protection",
    description: "Conserving Scandinavian boreal peatlands that store more carbon per hectare than tropical forests.",
    link: "#",
    featured: false
  },
  {
    lat: 5.0,
    lon: -3.0,
    title: "West African Mangrove Restoration",
    description: "Replanting coastal mangrove belts in Ghana, Côte d'Ivoire, and Liberia for fishery and climate resilience.",
    link: "#",
    featured: false
  },
  {
    lat: 38.0,
    lon: 15.0,
    title: "Mediterranean Marine Network",
    description: "Expanding marine protected areas across 22 countries to safeguard posidonia meadows and bluefin tuna.",
    link: "#",
    featured: false
  },
  {
    lat: 52.0,
    lon: 22.0,
    title: "European Rewilding Network",
    description: "Returning bison, lynx, and wolves to former habitats across Poland, Romania, and the Carpathians.",
    link: "#",
    featured: false
  },
  {
    lat: -58.0,
    lon: 60.0,
    title: "Southern Ocean Sanctuary",
    description: "Campaigning for the world's largest ocean reserve to protect Antarctic krill, penguins, and humpback whales.",
    link: "#",
    featured: false
  },
  {
    lat: 22.5,
    lon: 80.0,
    title: "Central India Tiger Corridor",
    description: "Securing forest connectivity between Panna and Kanha tiger reserves to maintain genetic diversity.",
    link: "#",
    featured: false
  },
  {
    lat: 8.0,
    lon: 38.0,
    title: "Ethiopian Highland Reforestation",
    description: "Community-led afforestation recovering 100,000 hectares of degraded land in the Ethiopian highlands.",
    link: "#",
    featured: false
  },
  {
    lat: -33.0,
    lon: 26.0,
    title: "Cape Floral Kingdom",
    description: "Protecting South Africa's fynbos biome — one of the world's most biodiverse terrestrial hotspots.",
    link: "#",
    featured: false
  },
  {
    lat: -43.5,
    lon: 172.5,
    title: "Aotearoa Predator-Free Sanctuaries",
    description: "Island reserves in New Zealand protecting kiwi, kakapo, and native forest birds from invasive predators.",
    link: "#",
    featured: false
  },
  {
    lat: 33.0,
    lon: 45.0,
    title: "Mesopotamian Marshes Restoration",
    description: "Reflooding the drained Tigris-Euphrates wetlands in Iraq — cradle of civilization and endangered otter habitat.",
    link: "#",
    featured: false
  },
  {
    lat: 68.0,
    lon: 68.0,
    title: "West Siberian Wilderness Reserve",
    description: "Designating new protected zones to shield intact boreal forest and permafrost from industrial expansion.",
    link: "#",
    featured: false
  },
  {
    lat: 24.0,
    lon: -10.0,
    title: "Saharan Cheetah Refuge",
    description: "Radio-tracking and protecting critically endangered Saharan cheetah populations across North Africa.",
    link: "#",
    featured: false
  },
  {
    lat: -27.0,
    lon: 153.0,
    title: "Daintree Rainforest Buyback",
    description: "Purchasing privately held land within the Daintree lowlands to permanently remove development risk.",
    link: "#",
    featured: false
  }
];
