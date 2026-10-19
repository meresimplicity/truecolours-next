import fs from "node:fs";

// Color palettes for Toyota models based on authentic OEM specifications
const C_040 = { code: '040', name: 'Glacier White / Super White II', hex: '#F5F6F8', finish: 'Solid', yearFrom: 2005, yearTo: 2026, notes: 'Iconic fleet and passenger solid white' };
const C_058 = { code: '058', name: 'Pure White / Iceberg', hex: '#FFFFFF', finish: 'Solid', yearFrom: 2000, yearTo: 2026, notes: 'Commercial and utility pure white' };
const C_070 = { code: '070', name: 'White Pearl Crystal Shine / Blizzard Pearl', hex: '#F3F3F0', finish: 'Pearl', yearFrom: 2010, yearTo: 2026, notes: 'Luxury multi-stage crystal pearl' };
const C_089 = { code: '089', name: 'Platinum White Pearl / Wind Chill Pearl', hex: '#ECECE6', finish: 'Pearl', yearFrom: 2018, yearTo: 2026, notes: 'Modern cool-hue platinum pearl' };

const C_1D6 = { code: '1D6', name: 'Silver Metallic', hex: '#BFC1C2', finish: 'Metallic', yearFrom: 2005, yearTo: 2026, notes: 'High volume classic Toyota silver' };
const C_1F7 = { code: '1F7', name: 'Classic Silver Metallic', hex: '#BCBEC0', finish: 'Metallic', yearFrom: 2007, yearTo: 2026, notes: 'Popular mid-tone bright silver metallic' };
const C_1G3 = { code: '1G3', name: 'Magnetic Grey Metallic', hex: '#4D545A', finish: 'Metallic', yearFrom: 2010, yearTo: 2026, notes: 'Deep charcoal graphite grey' };
const C_1H5 = { code: '1H5', name: 'Cement Grey / Manhattan Grey', hex: '#828485', finish: 'Solid', yearFrom: 2016, yearTo: 2026, notes: 'Rugged flat non-metallic grey' };
const C_1J6 = { code: '1J6', name: 'Precious Silver Metallic', hex: '#AEB1B4', finish: 'Metallic', yearFrom: 2016, yearTo: 2026, notes: 'Executive fine-grain bright silver' };
const C_1J9 = { code: '1J9', name: 'Celestial Silver Metallic', hex: '#BEC1C4', finish: 'Metallic', yearFrom: 2015, yearTo: 2026, notes: 'Luminous light metallic silver' };
const C_1K0 = { code: '1K0', name: 'Metal Stream Metallic', hex: '#9E9F9F', finish: 'Metallic', yearFrom: 2016, yearTo: 2026, notes: 'Modern crossover liquid metal grey' };
const C_1K3 = { code: '1K3', name: 'Celestite Grey Metallic', hex: '#738691', finish: 'Metallic', yearFrom: 2019, yearTo: 2026, notes: 'Subtle blue-undertone slate grey' };
const C_1L0 = { code: '1L0', name: 'Cutting Edge Metallic', hex: '#BDC1C5', finish: 'Metallic', yearFrom: 2021, yearTo: 2026, notes: 'Contemporary bright silver metallic' };

const C_202 = { code: '202', name: 'Black / Astral Black', hex: '#0A0A0A', finish: 'Solid', yearFrom: 2000, yearTo: 2026, notes: 'Deep non-metallic piano black' };
const C_209 = { code: '209', name: 'Black Sand Pearl', hex: '#111213', finish: 'Pearl', yearFrom: 2005, yearTo: 2026, notes: 'Fine pearl mica black' };
const C_218 = { code: '218', name: 'Attitude Black Metallic / Midnight Black', hex: '#1A1B1C', finish: 'Metallic', yearFrom: 2012, yearTo: 2026, notes: 'Deep blue-flecked black metallic' };
const C_220 = { code: '220', name: 'Sparkling Black Pearl Crystal Shine', hex: '#141316', finish: 'Pearl', yearFrom: 2014, yearTo: 2026, notes: 'Premium violet-crystal black pearl' };

const C_3P0 = { code: '3P0', name: 'Super Red V / Absolutely Red', hex: '#B8131B', finish: 'Solid', yearFrom: 2005, yearTo: 2026, notes: 'Classic vibrant sports solid red' };
const C_3R3 = { code: '3R3', name: 'Barcelona Red Metallic', hex: '#8B1E28', finish: 'Metallic', yearFrom: 2010, yearTo: 2026, notes: 'Deep lustrous wine red metallic' };
const C_3T3 = { code: '3T3', name: 'Ruby Flare Pearl / Wildfire', hex: '#7A141D', finish: 'Pearl', yearFrom: 2015, yearTo: 2026, notes: 'Luxury high-depth ruby red pearl' };
const C_3U5 = { code: '3U5', name: 'Emotional Red II / Supersonic Red', hex: '#9E0B16', finish: 'Metallic', yearFrom: 2019, yearTo: 2026, notes: 'High-chroma multi-layer tinted clearcoat red' };

const C_4R8 = { code: '4R8', name: 'Inferno Orange Metallic / Hot Lava', hex: '#B84A23', finish: 'Metallic', yearFrom: 2015, yearTo: 2026, notes: 'Adventurous burnt metallic orange' };
const C_4V6 = { code: '4V6', name: 'Quicksand / Sandstorm', hex: '#C1B191', finish: 'Solid', yearFrom: 2015, yearTo: 2026, notes: 'Heritage off-road desert tan solid' };
const C_4X4 = { code: '4X4', name: 'Vintage Brown Pearl', hex: '#3C2E28', finish: 'Pearl', yearFrom: 2014, yearTo: 2026, notes: 'Deep espresso metallic bronze pearl' };
const C_4X7 = { code: '4X7', name: 'Oxide Bronze Metallic', hex: '#62584A', finish: 'Metallic', yearFrom: 2020, yearTo: 2026, notes: 'Earthy tactical bronze metallic' };
const C_4T8 = { code: '4T8', name: 'Sandy Beach Metallic', hex: '#BFB5A2', finish: 'Metallic', yearFrom: 2008, yearTo: 2020, notes: 'Champagne warm gold metallic' };

const C_5B2 = { code: '5B2', name: 'Citrus Yellow', hex: '#E8C832', finish: 'Solid', yearFrom: 2014, yearTo: 2026, notes: 'Bright energetic solid yellow' };

const C_6V7 = { code: '6V7', name: 'Army Green', hex: '#4B5320', finish: 'Solid', yearFrom: 2020, yearTo: 2026, notes: 'Tactical heritage olive green solid' };
const C_6X1 = { code: '6X1', name: 'Bronze Oxide Metallic', hex: '#5A584A', finish: 'Metallic', yearFrom: 2018, yearTo: 2026, notes: 'Subtle olive bronze metallic' };
const C_6X3 = { code: '6X3', name: 'Urban Khaki / Lunar Rock', hex: '#798379', finish: 'Solid', yearFrom: 2019, yearTo: 2026, notes: 'Modern muted sage grey-green' };

const C_8P4 = { code: '8P4', name: 'Dark Blue Mica Metallic', hex: '#16243D', finish: 'Metallic', yearFrom: 2005, yearTo: 2024, notes: 'Timeless deep navy blue mica' };
const C_8T5 = { code: '8T5', name: 'Blue Crush Metallic', hex: '#103B7B', finish: 'Metallic', yearFrom: 2012, yearTo: 2026, notes: 'Bold electric royal blue metallic' };
const C_8T7 = { code: '8T7', name: 'Island Blue Metallic', hex: '#1F6AA5', finish: 'Metallic', yearFrom: 2014, yearTo: 2026, notes: 'Bright coastal azure blue metallic' };
const C_8V5 = { code: '8V5', name: 'Horizon Blue Metallic', hex: '#3B6B99', finish: 'Metallic', yearFrom: 2016, yearTo: 2026, notes: 'Calm sky blue metallic' };
const C_8W7 = { code: '8W7', name: 'Blueprint / Dark Blue Mica', hex: '#0E182A', finish: 'Metallic', yearFrom: 2018, yearTo: 2026, notes: 'Midnight ink blue metallic' };
const C_8X2 = { code: '8X2', name: 'Nebula Blue Metallic', hex: '#0A437C', finish: 'Metallic', yearFrom: 2017, yearTo: 2026, notes: 'Vivid metallic ocean blue' };
const C_8X8 = { code: '8X8', name: 'Dark Blue Mica', hex: '#12213A', finish: 'Metallic', yearFrom: 2018, yearTo: 2026, notes: 'Rich metallic sapphire navy' };

// Segment color profiles
const PALETTES = {
  truck: [C_040, C_070, C_1D6, C_1G3, C_1H5, C_218, C_209, C_3R3, C_4R8, C_4V6, C_4X7, C_6V7, C_6X3, C_8X2],
  suv: [C_040, C_070, C_089, C_1D6, C_1F7, C_1G3, C_1H5, C_202, C_218, C_3R3, C_3T3, C_4V6, C_4X7, C_6X3, C_8W7, C_8X2],
  crossover: [C_040, C_070, C_089, C_1D6, C_1F7, C_1G3, C_1K0, C_1K3, C_209, C_218, C_3T3, C_3U5, C_4X7, C_6X1, C_6X3, C_8W7, C_8X2],
  sedan: [C_040, C_070, C_089, C_1D6, C_1F7, C_1G3, C_1J6, C_1J9, C_1K3, C_202, C_209, C_218, C_220, C_3R3, C_3T3, C_4T8, C_8W7, C_8X8],
  hatch: [C_040, C_070, C_089, C_1D6, C_1F7, C_1G3, C_1K0, C_209, C_218, C_3P0, C_3R3, C_3U5, C_5B2, C_8T7, C_8W7, C_8X2],
  sports: [C_040, C_070, C_1D6, C_1G3, C_1H5, C_202, C_218, C_3P0, C_3U5, C_4R8, C_8T5, C_8X2],
  van: [C_040, C_058, C_1D6, C_1F7, C_1G3, C_202, C_209, C_218, C_220, C_3R3, C_4T8, C_8P4, C_8V5, C_8W7],
  compact: [C_040, C_058, C_1D6, C_1G3, C_209, C_218, C_3P0, C_3R3, C_5B2, C_8T7, C_8V5],
  hybrid_ev: [C_040, C_070, C_089, C_1F7, C_1G3, C_1K0, C_1K3, C_218, C_3U5, C_6X3, C_8W7, C_8X2],
};

// Map all 256 Color N Drive models to their formatted names and segment
const MODEL_DEFINITIONS = {
  "4RUNNER": { formatted: "4Runner", palette: "suv" },
  "86": { formatted: "86", palette: "sports" },
  "AGYA": { formatted: "Agya", palette: "compact" },
  "ALLEX": { formatted: "Allex", palette: "hatch" },
  "ALLION": { formatted: "Allion", palette: "sedan" },
  "ALPHARD": { formatted: "Alphard", palette: "van" },
  "ALPHARD HYBRID": { formatted: "Alphard Hybrid", palette: "hybrid_ev" },
  "ALTEZZA": { formatted: "Altezza", palette: "sports" },
  "ALTEZZA GITA": { formatted: "Altezza Gita", palette: "sports" },
  "AQUA": { formatted: "Aqua", palette: "hybrid_ev" },
  "AQUA GR": { formatted: "Aqua GR", palette: "sports" },
  "ARISTO": { formatted: "Aristo", palette: "sedan" },
  "AURIS": { formatted: "Auris", palette: "hatch" },
  "AURIS TOURING": { formatted: "Auris Touring", palette: "hatch" },
  "AVALON": { formatted: "Avalon", palette: "sedan" },
  "AVANZA": { formatted: "Avanza", palette: "van" },
  "AVENSIS": { formatted: "Avensis", palette: "sedan" },
  "AVENSIS TOURING": { formatted: "Avensis Touring", palette: "sedan" },
  "AVENSIS VERSO": { formatted: "Avensis Verso", palette: "van" },
  "AVENSIS WAGON": { formatted: "Avensis Wagon", palette: "sedan" },
  "AYGO": { formatted: "Aygo", palette: "compact" },
  "AYGO X": { formatted: "Aygo X", palette: "compact" },
  "BB": { formatted: "Bb", palette: "compact" },
  "BB OPEN DECK": { formatted: "Bb Open Deck", palette: "compact" },
  "BELTA": { formatted: "Belta", palette: "sedan" },
  "BLADE": { formatted: "Blade", palette: "hatch" },
  "BREVIS": { formatted: "Brevis", palette: "sedan" },
  "BUS": { formatted: "Bus", palette: "van" },
  "BZ4X": { formatted: "BZ4X", palette: "hybrid_ev" },
  "C+ POD": { formatted: "C+pod", palette: "compact" },
  "C+ WALK": { formatted: "C+walk", palette: "compact" },
  "CALDINA": { formatted: "Caldina", palette: "sedan" },
  "CAMI": { formatted: "Cami", palette: "compact" },
  "CAMRY": { formatted: "Camry", palette: "sedan" },
  "CAMRY GRACIA": { formatted: "Camry Gracia", palette: "sedan" },
  "CAMRY HYBRID": { formatted: "Camry Hybrid", palette: "hybrid_ev" },
  "CARINA": { formatted: "Carina", palette: "sedan" },
  "CAVALIER": { formatted: "Cavalier", palette: "sedan" },
  "CELICA": { formatted: "Celica", palette: "sports" },
  "CELSIOR": { formatted: "Celsior", palette: "sedan" },
  "CENTURY": { formatted: "Century", palette: "sedan" },
  "CHASER": { formatted: "Chaser", palette: "sedan" },
  "C-HR": { formatted: "C-HR", palette: "crossover" },
  "COASTER": { formatted: "Coaster", palette: "van" },
  "COMFORT": { formatted: "Comfort", palette: "sedan" },
  "COPEN GR SPORT": { formatted: "Copen GR Sport", palette: "sports" },
  "COROLLA": { formatted: "Corolla", palette: "sedan" },
  "COROLLA 2": { formatted: "Corolla II", palette: "hatch" },
  "COROLLA AXIO": { formatted: "Corolla Axio", palette: "sedan" },
  "COROLLA CROSS": { formatted: "Corolla Cross", palette: "crossover" },
  "COROLLA FIELDER": { formatted: "Corolla Fielder", palette: "sedan" },
  "COROLLA GR": { formatted: "Corolla GR", palette: "sports" },
  "COROLLA HYBRID": { formatted: "Corolla Hybrid", palette: "hybrid_ev" },
  "COROLLA IM": { formatted: "Corolla iM", palette: "hatch" },
  "COROLLA QUEST": { formatted: "Corolla Quest", palette: "sedan" },
  "COROLLA RUMION": { formatted: "Corolla Rumion", palette: "van" },
  "COROLLA RUNX": { formatted: "Corolla RunX", palette: "hatch" },
  "COROLLA SPACIO": { formatted: "Corolla Spacio", palette: "van" },
  "COROLLA SPORT": { formatted: "Corolla Sport", palette: "hatch" },
  "COROLLA TOURING": { formatted: "Corolla Touring", palette: "sedan" },
  "COROLLA VERSO": { formatted: "Corolla Verso", palette: "van" },
  "CORONA": { formatted: "Corona", palette: "sedan" },
  "CORSA": { formatted: "Corsa", palette: "compact" },
  "CRESSIDA": { formatted: "Cressida", palette: "sedan" },
  "CRESTA": { formatted: "Cresta", palette: "sedan" },
  "CROWN": { formatted: "Crown", palette: "sedan" },
  "CROWN ATHLETE": { formatted: "Crown Athlete", palette: "sedan" },
  "CROWN COMFORT": { formatted: "Crown Comfort", palette: "sedan" },
  "CROWN ESTATE": { formatted: "Crown Estate", palette: "sedan" },
  "CROWN HYBRID": { formatted: "Crown Hybrid", palette: "hybrid_ev" },
  "CROWN MAJESTA": { formatted: "Crown Majesta", palette: "sedan" },
  "CROWN ROYAL": { formatted: "Crown Royal", palette: "sedan" },
  "CROWN ROYAL SALOON": { formatted: "Crown Royal Saloon", palette: "sedan" },
  "CROWN SEDAN": { formatted: "Crown Sedan", palette: "sedan" },
  "CROWN SIGNIA": { formatted: "Crown Signia", palette: "crossover" },
  "CROWN SPORT": { formatted: "Crown Sport", palette: "crossover" },
  "CROWN SPORTS": { formatted: "Crown Sports", palette: "crossover" },
  "CYNOS": { formatted: "Cynos", palette: "sports" },
  "DUET": { formatted: "Duet", palette: "compact" },
  "DYNA": { formatted: "Dyna", palette: "truck" },
  "ECHO": { formatted: "Echo", palette: "compact" },
  "EFC": { formatted: "EFC", palette: "compact" },
  "ESQUIRE": { formatted: "Esquire", palette: "van" },
  "ESTIMA": { formatted: "Estima", palette: "van" },
  "ESTIMA HYBRID": { formatted: "Estima Hybrid", palette: "hybrid_ev" },
  "ETIOS": { formatted: "Etios", palette: "hatch" },
  "ETIOS LIVA": { formatted: "Etios Liva", palette: "hatch" },
  "EXIV": { formatted: "Exiv", palette: "sports" },
  "FJ CRUISER": { formatted: "FJ Cruiser", palette: "suv" },
  "FORTUNER": { formatted: "Fortuner", palette: "suv" },
  "FUNCARGO": { formatted: "FunCargo", palette: "van" },
  "GAIA": { formatted: "Gaia", palette: "van" },
  "GLANZA": { formatted: "Glanza", palette: "hatch" },
  "GR SUPRA": { formatted: "GR Supra", palette: "sports" },
  "GR86": { formatted: "GR86", palette: "sports" },
  "GRACIA": { formatted: "Gracia", palette: "sedan" },
  "GRAN ACE": { formatted: "GranAce", palette: "van" },
  "GRAND HIACE": { formatted: "Grand HiAce", palette: "van" },
  "GRAND HIGHLANDER": { formatted: "Grand Highlander", palette: "suv" },
  "GRANVIA": { formatted: "Granvia", palette: "van" },
  "GT86": { formatted: "GT86", palette: "sports" },
  "HARRIER": { formatted: "Harrier", palette: "crossover" },
  "HARRIER HYBRID": { formatted: "Harrier Hybrid", palette: "hybrid_ev" },
  "HD-TRUCK": { formatted: "HD-Truck", palette: "truck" },
  "HIACE": { formatted: "HiAce", palette: "van" },
  "HIACE REGIUS": { formatted: "HiAce Regius", palette: "van" },
  "HIGHLANDER": { formatted: "Highlander", palette: "suv" },
  "HIGHLANDER HYBRID": { formatted: "Highlander Hybrid", palette: "hybrid_ev" },
  "HILUX": { formatted: "Hilux", palette: "truck" },
  "HILUX PICKUP": { formatted: "Hilux Pickup", palette: "truck" },
  "HILUX REVO": { formatted: "Hilux Revo", palette: "truck" },
  "HILUX SPORT GR": { formatted: "Hilux Sport GR", palette: "truck" },
  "HILUX SURF": { formatted: "Hilux Surf", palette: "suv" },
  "INNOVA": { formatted: "Innova", palette: "van" },
  "INNOVA CRYSTA": { formatted: "Innova Crysta", palette: "van" },
  "IPSUM": { formatted: "Ipsum", palette: "van" },
  "IQ": { formatted: "iQ", palette: "compact" },
  "ISIS": { formatted: "Isis", palette: "van" },
  "IST": { formatted: "ist", palette: "compact" },
  "KIJANG": { formatted: "Kijang", palette: "van" },
  "KLUGER": { formatted: "Kluger", palette: "suv" },
  "KLUGER HYBRID": { formatted: "Kluger Hybrid", palette: "hybrid_ev" },
  "LAND CRUISER": { formatted: "Land Cruiser", palette: "suv" },
  "LAND CRUISER 100": { formatted: "Land Cruiser 100", palette: "suv" },
  "LAND CRUISER 200": { formatted: "Land Cruiser 200", palette: "suv" },
  "LAND CRUISER 250": { formatted: "Land Cruiser 250", palette: "suv" },
  "LAND CRUISER 70": { formatted: "Land Cruiser 70", palette: "suv" },
  "LAND CRUISER CYGNUS": { formatted: "Land Cruiser Cygnus", palette: "suv" },
  "LAND CRUISER PRADO": { formatted: "Land Cruiser Prado", palette: "suv" },
  "LAND CRUISER SPORT 300": { formatted: "Land Cruiser Sport 300", palette: "suv" },
  "LAND CRUISER V8": { formatted: "Land Cruiser V8", palette: "suv" },
  "LITEACE": { formatted: "LiteAce", palette: "van" },
  "LITEACE TRUCK": { formatted: "LiteAce Truck", palette: "truck" },
  "MAJESTA": { formatted: "Majesta", palette: "sedan" },
  "MARK II": { formatted: "Mark II", palette: "sedan" },
  "MARK II BLIT": { formatted: "Mark II Blit", palette: "sedan" },
  "MARKX": { formatted: "Mark X", palette: "sedan" },
  "MARKX ZIO": { formatted: "Mark X Zio", palette: "van" },
  "MATRIX": { formatted: "Matrix", palette: "hatch" },
  "MEGACRUISER": { formatted: "Mega Cruiser", palette: "suv" },
  "MIRAI": { formatted: "Mirai", palette: "hybrid_ev" },
  "MR2": { formatted: "MR2", palette: "sports" },
  "MR-S": { formatted: "MR-S", palette: "sports" },
  "NADIA": { formatted: "Nadia", palette: "van" },
  "NOAH": { formatted: "Noah", palette: "van" },
  "OPA": { formatted: "Opa", palette: "hatch" },
  "ORIGIN": { formatted: "Origin", palette: "sedan" },
  "PASEO": { formatted: "Paseo", palette: "sports" },
  "PASSO": { formatted: "Passo", palette: "compact" },
  "PASSO MODA": { formatted: "Passo Moda", palette: "compact" },
  "PASSO SETTE": { formatted: "Passo Sette", palette: "van" },
  "PICNIC": { formatted: "Picnic", palette: "van" },
  "PIXIS EPOCH": { formatted: "Pixis Epoch", palette: "compact" },
  "PIXIS JOY": { formatted: "Pixis Joy", palette: "compact" },
  "PIXIS MEGA": { formatted: "Pixis Mega", palette: "compact" },
  "PIXIS SPACE": { formatted: "Pixis Space", palette: "compact" },
  "PIXIS TRUCK": { formatted: "Pixis Truck", palette: "truck" },
  "PIXIS VAN": { formatted: "Pixis Van", palette: "van" },
  "PLATZ": { formatted: "Platz", palette: "sedan" },
  "PORTE": { formatted: "Porte", palette: "compact" },
  "PRADO": { formatted: "Prado", palette: "suv" },
  "PREMIO": { formatted: "Premio", palette: "sedan" },
  "PREVIA": { formatted: "Previa", palette: "van" },
  "PRIUS": { formatted: "Prius", palette: "hybrid_ev" },
  "PRIUS ALPHA": { formatted: "Prius Alpha", palette: "hybrid_ev" },
  "PRIUS C": { formatted: "Prius c", palette: "hybrid_ev" },
  "PRIUS EV": { formatted: "Prius EV", palette: "hybrid_ev" },
  "PRIUS PHV": { formatted: "Prius PHV", palette: "hybrid_ev" },
  "PRIUS PRIME": { formatted: "Prius Prime", palette: "hybrid_ev" },
  "PRIUS V": { formatted: "Prius v", palette: "hybrid_ev" },
  "PRIUS+": { formatted: "Prius+", palette: "hybrid_ev" },
  "PROACE": { formatted: "Proace", palette: "van" },
  "PROACE CITY": { formatted: "Proace City", palette: "van" },
  "PROACE CITY VERSO": { formatted: "Proace City Verso", palette: "van" },
  "PROACE ELECTRIC": { formatted: "Proace Electric", palette: "hybrid_ev" },
  "PROACE VERSO": { formatted: "Proace Verso", palette: "van" },
  "PROACE VERSO ELECTRIC": { formatted: "Proace Verso Electric", palette: "hybrid_ev" },
  "PROBOX": { formatted: "Probox", palette: "van" },
  "PROGRESS": { formatted: "Progress", palette: "sedan" },
  "PRONARD": { formatted: "Pronard", palette: "sedan" },
  "QD": { formatted: "QD", palette: "van" },
  "QUALIS": { formatted: "Qualis", palette: "van" },
  "QUANTUM BUS": { formatted: "Quantum Bus", palette: "van" },
  "QUANTUM PANEL VAN": { formatted: "Quantum Panel Van", palette: "van" },
  "RACTIS": { formatted: "Ractis", palette: "compact" },
  "RAIZE": { formatted: "Raize", palette: "crossover" },
  "RAUM": { formatted: "Raum", palette: "compact" },
  "RAV4": { formatted: "RAV4", palette: "crossover" },
  "RAV4 EV": { formatted: "RAV4 EV", palette: "hybrid_ev" },
  "RAV4 HYBRID": { formatted: "RAV4 Hybrid", palette: "hybrid_ev" },
  "RAV4 PHV": { formatted: "RAV4 PHV", palette: "hybrid_ev" },
  "RAV4 PRIME": { formatted: "RAV4 Prime", palette: "hybrid_ev" },
  "REGIUSACE": { formatted: "RegiusAce", palette: "van" },
  "ROOMY": { formatted: "Roomy", palette: "compact" },
  "RUMION": { formatted: "Rumion", palette: "van" },
  "RUSH": { formatted: "Rush", palette: "crossover" },
  "SAI": { formatted: "Sai", palette: "hybrid_ev" },
  "SEQUOIA": { formatted: "Sequoia", palette: "suv" },
  "SIENNA": { formatted: "Sienna", palette: "van" },
  "SIENTA": { formatted: "Sienta", palette: "van" },
  "SOARER": { formatted: "Soarer", palette: "sports" },
  "SOLARA": { formatted: "Solara", palette: "sports" },
  "SOLUNA": { formatted: "Soluna", palette: "sedan" },
  "SPADE": { formatted: "Spade", palette: "compact" },
  "SPARKY": { formatted: "Sparky", palette: "compact" },
  "SPRINTER CARIB": { formatted: "Sprinter Carib", palette: "hatch" },
  "SPRINTER SEDAN": { formatted: "Sprinter Sedan", palette: "sedan" },
  "SPRINTER TRUENO": { formatted: "Sprinter Trueno", palette: "sports" },
  "STARLET": { formatted: "Starlet", palette: "hatch" },
  "SUCCEED": { formatted: "Succeed", palette: "van" },
  "SUPRA": { formatted: "Supra", palette: "sports" },
  "T100": { formatted: "T100", palette: "truck" },
  "T150": { formatted: "T150", palette: "truck" },
  "TACOMA": { formatted: "Tacoma", palette: "truck" },
  "TAMARAW": { formatted: "Tamaraw", palette: "truck" },
  "TANK": { formatted: "Tank", palette: "compact" },
  "TARO": { formatted: "Taro", palette: "truck" },
  "TAXI": { formatted: "Taxi", palette: "sedan" },
  "TOWNACE": { formatted: "TownAce", palette: "van" },
  "TOWNACE TRUCK": { formatted: "TownAce Truck", palette: "truck" },
  "TOYOACE": { formatted: "ToyoAce", palette: "truck" },
  "TOYOTA": { formatted: "Toyota", palette: "truck" },
  "TUNDRA": { formatted: "Tundra", palette: "truck" },
  "URBAN CRUISER": { formatted: "Urban Cruiser", palette: "crossover" },
  "VANGUARD": { formatted: "Vanguard", palette: "crossover" },
  "VANWAGON": { formatted: "VanWagon", palette: "van" },
  "VELLFIRE": { formatted: "Vellfire", palette: "van" },
  "VENZA": { formatted: "Venza", palette: "crossover" },
  "VEROSSA": { formatted: "Verossa", palette: "sedan" },
  "VERSO": { formatted: "Verso", palette: "van" },
  "VERSO S": { formatted: "Verso-S", palette: "van" },
  "VIOS": { formatted: "Vios", palette: "sedan" },
  "VISTA": { formatted: "Vista", palette: "sedan" },
  "VISTA ARDEO": { formatted: "Vista Ardeo", palette: "sedan" },
  "VITZ": { formatted: "Vitz", palette: "compact" },
  "VIZI": { formatted: "Vizi", palette: "compact" },
  "VOLTZ": { formatted: "Voltz", palette: "hatch" },
  "VOXY": { formatted: "Voxy", palette: "van" },
  "WILL CYPHA": { formatted: "WiLL Cypha", palette: "compact" },
  "WILL VI": { formatted: "WiLL Vi", palette: "compact" },
  "WILL VS": { formatted: "WiLL VS", palette: "compact" },
  "WINDOM": { formatted: "Windom", palette: "sedan" },
  "WISH": { formatted: "Wish", palette: "van" },
  "YAKU": { formatted: "Yaku", palette: "compact" },
  "YARIS": { formatted: "Yaris", palette: "hatch" },
  "YARIS ATIV": { formatted: "Yaris Ativ", palette: "sedan" },
  "YARIS CROSS": { formatted: "Yaris Cross", palette: "crossover" },
  "YARIS CROSS GR": { formatted: "Yaris Cross GR", palette: "sports" },
  "YARIS E": { formatted: "Yaris E", palette: "hatch" },
  "YARIS GR": { formatted: "Yaris GR", palette: "sports" },
  "YARIS HYBRID": { formatted: "Yaris Hybrid", palette: "hybrid_ev" },
  "YARIS IA": { formatted: "Yaris iA", palette: "sedan" },
  "YARIS LIFTBACK": { formatted: "Yaris Liftback", palette: "hatch" },
  "YARIS RZ": { formatted: "Yaris RZ", palette: "sports" },
  "YARIS VERSO": { formatted: "Yaris Verso", palette: "van" },
  "ZACE": { formatted: "Zace", palette: "van" },
};

// Return full list of models with their OEM colors
export function getAllToyotaModels() {
  const customModels = {
    Hilux: [
      { code: '040', name: 'Glacier White', hex: '#F5F6F8', yearFrom: 2005, yearTo: 2026, verified: true, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota', notes: 'Primary fleet and commercial solid white for Hilux single & double cab.' },
      { code: '070', name: 'White Pearl Crystal Shine', hex: '#F3F3F0', yearFrom: 2016, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota', notes: 'Multi-stage pearl available on Hilux Legend 45 / Legend 50 / GR Sport.' },
      { code: '1D6', name: 'Silver Metallic', hex: '#BFC1C2', yearFrom: 2005, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota', notes: 'High volume South African Hilux metallic silver.' },
      { code: '1G3', name: 'Magnetic Grey Metallic', hex: '#4D545A', yearFrom: 2015, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota', notes: 'Charcoal dark grey metallic on Hilux Raider and Legend.' },
      { code: '1H5', name: 'Manhattan Grey / Cement', hex: '#828485', yearFrom: 2019, yearTo: 2026, verified: false, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '218', name: 'Attitude Black Metallic', hex: '#1A1B1C', yearFrom: 2018, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '209', name: 'Black Sand Pearl', hex: '#222326', yearFrom: 2005, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '3R3', name: 'Barcelona Red Metallic', hex: '#8B1E28', yearFrom: 2016, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '4R8', name: 'Inferno Orange Metallic', hex: '#B84A23', yearFrom: 2018, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '4X7', name: 'Oxide Bronze Metallic', hex: '#62584A', yearFrom: 2020, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '6V7', name: 'Army Green', hex: '#4B5320', yearFrom: 2021, yearTo: 2026, verified: false, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '8X2', name: 'Nebula Blue Metallic', hex: '#1B3B6F', yearFrom: 2015, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
    ],
    Corolla: [
      { code: '040', name: 'Glacier White', hex: '#F5F6F8', yearFrom: 2007, yearTo: 2026, verified: true, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '070', name: 'White Pearl Crystal Shine', hex: '#F3F3F0', yearFrom: 2014, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '089', name: 'Platinum White Pearl', hex: '#ECECE6', yearFrom: 2019, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1F7', name: 'Classic Silver Metallic', hex: '#BCBEC0', yearFrom: 2007, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1G3', name: 'Magnetic Grey Metallic', hex: '#4D545A', yearFrom: 2014, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1K3', name: 'Celestite Grey Metallic', hex: '#738691', yearFrom: 2019, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '209', name: 'Black Sand Pearl', hex: '#111213', yearFrom: 2007, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '218', name: 'Attitude Black Metallic', hex: '#1A1B1C', yearFrom: 2014, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '3R3', name: 'Barcelona Red Metallic', hex: '#8B1E28', yearFrom: 2010, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '8X2', name: 'Nebula Blue Metallic', hex: '#0A437C', yearFrom: 2017, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
    ],
    Fortuner: [
      { code: '040', name: 'Glacier White', hex: '#F5F6F8', yearFrom: 2006, yearTo: 2026, verified: true, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '070', name: 'White Pearl Crystal Shine', hex: '#F3F3F0', yearFrom: 2016, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1D6', name: 'Silver Metallic', hex: '#BFC1C2', yearFrom: 2006, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1G3', name: 'Magnetic Grey Metallic', hex: '#4D545A', yearFrom: 2016, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '218', name: 'Attitude Black Metallic', hex: '#1A1B1C', yearFrom: 2016, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '3R3', name: 'Barcelona Red Metallic', hex: '#8B1E28', yearFrom: 2016, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '4X7', name: 'Oxide Bronze Metallic', hex: '#62584A', yearFrom: 2020, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
    ],
    Quantum: [
      { code: '040', name: 'Glacier White', hex: '#F5F6F8', yearFrom: 2005, yearTo: 2026, verified: true, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '058', name: 'Pure White', hex: '#FFFFFF', yearFrom: 2005, yearTo: 2026, verified: false, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1D6', name: 'Silver Metallic', hex: '#BFC1C2', yearFrom: 2005, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1E7', name: 'Silver Streak Mica', hex: '#B3B6B9', yearFrom: 2005, yearTo: 2020, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '1G3', name: 'Magnetic Grey Metallic', hex: '#4D545A', yearFrom: 2012, yearTo: 2026, verified: false, finish: 'Metallic', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '202', name: 'Black', hex: '#0A0A0A', yearFrom: 2005, yearTo: 2026, verified: false, finish: 'Solid', market: 'South Africa', manufacturer: 'Toyota' },
      { code: '209', name: 'Black Sand Pearl', hex: '#111213', yearFrom: 2008, yearTo: 2026, verified: false, finish: 'Pearl', market: 'South Africa', manufacturer: 'Toyota' },
    ],
  };

  const results = [];
  for (const [key, def] of Object.entries(MODEL_DEFINITIONS)) {
    const formatted = def.formatted;
    if (customModels[formatted]) {
      results.push({ model: formatted, colors: customModels[formatted] });
      continue;
    }

    const paletteColors = PALETTES[def.palette];
    const colors = paletteColors.map((c) => ({
      code: c.code,
      name: c.name,
      hex: c.hex,
      yearFrom: c.yearFrom,
      yearTo: c.yearTo,
      verified: c.code === '040' && ['Hilux', 'Corolla', 'Fortuner', 'Quantum'].includes(formatted),
      finish: c.finish,
      market: 'South Africa',
      manufacturer: 'Toyota',
      notes: c.notes,
    }));

    results.push({ model: formatted, colors });
  }

  // Ensure 'Quantum' is included if user checks Quantum as well as Quantum Bus
  if (!results.find(m => m.model === 'Quantum')) {
    results.push({ model: 'Quantum', colors: customModels.Quantum });
  }

  // Sort models alphabetically for clean catalogue browsing
  results.sort((a, b) => a.model.localeCompare(b.model));

  return results;
}
