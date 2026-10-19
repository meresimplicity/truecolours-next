/**
 * add-all-remaining-brands.mjs
 * Comprehensive master script to populate authentic OEM vehicle models and paint colours for:
 *   1. Suzuki ("Susuki")
 *   2. Ford
 *   3. Nissan
 *   4. Kia
 *   5. Hyundai
 *   6. Mercedes-Benz ("Mercedes Benz")
 *   7. Citroën ("Citron" / "Citroen")
 *   8. Peugeot
 *   9. FAW ("Faw")
 *  10. Chevrolet
 *  11. Haval & GWM / Haval
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ─────────────────────────────────────────────────────────────────────────────
// BRAND DATA SPECIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const BRANDS_DATA = {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. SUZUKI
  // ───────────────────────────────────────────────────────────────────────────
  Suzuki: {
    manufacturer: "Suzuki Motor Corporation",
    colours: [
      { code: "Z7T", name: "Pearl White", hex: "#F2F2F2", finish: "Pearl", notes: "Suzuki signature triple-coat pearl white." },
      { code: "Z2S", name: "Silky Silver Metallic", hex: "#C5C6C8", finish: "Metallic", notes: "High volume bright silver metallic." },
      { code: "ZJ3", name: "Bluish Black Pearl", hex: "#17181C", finish: "Pearl", notes: "Deep bluish-black pearl finish." },
      { code: "ZNA", name: "Claret Red Metallic", hex: "#781926", finish: "Metallic", notes: "Rich wine-red metallic." },
      { code: "ZQL", name: "Prime Cool Black Metallic", hex: "#1B1C1E", finish: "Metallic", notes: "Sleek jet black metallic." },
      { code: "ZUS", name: "Breeze Blue Metallic", hex: "#2B547E", finish: "Metallic", notes: "Deep sky blue metallic." },
      { code: "ZVR", name: "Pure White Pearl", hex: "#F5F7FA", finish: "Pearl", notes: "Crisp modern pure pearl white." },
      { code: "ZY4", name: "Azure Grey Pearl Metallic", hex: "#4F5E68", finish: "Pearl", notes: "Subtle blue-grey graphite metallic." },
      { code: "ZWG", name: "Speedy Blue Metallic", hex: "#16467A", finish: "Metallic", notes: "Swift Sport launch dynamic electric blue." },
      { code: "ZWD", name: "Burning Red Pearl Metallic", hex: "#A81B26", finish: "Pearl", notes: "Swift / Vitara flagship vibrant red." },
      { code: "ZZC", name: "Jungle Green", hex: "#384C3D", finish: "Solid", notes: "Iconic Jimny military olive solid green." },
      { code: "ZZB", name: "Kinetic Yellow", hex: "#DCE33A", finish: "Solid", notes: "High-visibility Jimny signature neon yellow." },
      { code: "ZVL", name: "Medium Grey", hex: "#6B7074", finish: "Solid", notes: "Popular Jimny non-metallic Battleship grey." },
      { code: "ZQH", name: "Premium Silver Metallic", hex: "#A6A9AC", finish: "Metallic", notes: "Deep multi-layer premium silver." },
      { code: "ZWY", name: "Solar Yellow Pearl", hex: "#F3C31A", finish: "Pearl", notes: "Vibrant yellow pearl coat." },
      { code: "ZNC", name: "Premium Amber Orange Metallic", hex: "#BF531B", finish: "Metallic", notes: "Ignis / Vitara launch burnt orange." },
      { code: "26U", name: "Superior White", hex: "#FAFAFA", finish: "Solid", notes: "Clean solid white base coat." },
      { code: "ZAM", name: "Midnight Black Pearl", hex: "#111214", finish: "Pearl", notes: "Rich deep metallic midnight black." }
    ],
    models: [
      { model: "Swift", yearFrom: 2004, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWG","ZWD","ZY4","26U","ZVR"] },
      { model: "Swift Sport", yearFrom: 2006, yearTo: 2026, codes: ["ZWG","ZWD","Z7T","ZJ3","ZZB","26U"] },
      { model: "Swift Dzire", yearFrom: 2008, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA","26U"] },
      { model: "Dzire", yearFrom: 2017, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA","26U"] },
      { model: "Swift 1.2", yearFrom: 2011, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWG","ZWD","26U"] },
      { model: "Swift GL", yearFrom: 2011, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWG","26U"] },
      { model: "Swift GLX", yearFrom: 2011, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWG","ZWD","ZVR"] },
      { model: "Jimny", yearFrom: 1998, yearTo: 2026, codes: ["ZZC","ZZB","ZVL","Z7T","ZJ3","Z2S","26U"] },
      { model: "Jimny 3-Door", yearFrom: 1998, yearTo: 2026, codes: ["ZZC","ZZB","ZVL","Z7T","ZJ3","Z2S","26U"] },
      { model: "Jimny 5-Door", yearFrom: 2023, yearTo: 2026, codes: ["ZZC","ZZB","ZVL","Z7T","ZJ3","Z2S","ZWD"] },
      { model: "Jimny 1.5", yearFrom: 2018, yearTo: 2026, codes: ["ZZC","ZZB","ZVL","Z7T","ZJ3","Z2S","26U"] },
      { model: "Jimny Sierra", yearFrom: 1998, yearTo: 2026, codes: ["ZZC","ZZB","ZVL","Z7T","ZJ3","Z2S"] },
      { model: "Jimny GL", yearFrom: 2018, yearTo: 2026, codes: ["ZZC","ZVL","Z7T","26U","Z2S"] },
      { model: "Jimny GLX", yearFrom: 2018, yearTo: 2026, codes: ["ZZC","ZZB","ZVL","Z7T","ZJ3","Z2S"] },
      { model: "Vitara", yearFrom: 1988, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWD","ZWG","ZY4","ZNC"] },
      { model: "Grand Vitara", yearFrom: 1998, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZVR","ZQH","ZWD"] },
      { model: "Grand Vitara Hybrid", yearFrom: 2022, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZVR","ZQH"] },
      { model: "Vitara Brezza", yearFrom: 2016, yearTo: 2024, codes: ["Z7T","Z2S","ZJ3","ZWD","ZWG","ZNC","26U"] },
      { model: "Brezza", yearFrom: 2022, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWD","ZWG","26U"] },
      { model: "Baleno", yearFrom: 1995, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZWG","ZWD","26U"] },
      { model: "Baleno GL", yearFrom: 2016, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","26U"] },
      { model: "Baleno GLX", yearFrom: 2016, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZWG","ZWD"] },
      { model: "Celerio", yearFrom: 2014, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWD","ZWG","26U"] },
      { model: "Celerio 1.0", yearFrom: 2014, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZWD","26U"] },
      { model: "Ignis", yearFrom: 2000, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZNC","ZWG","ZZB","26U"] },
      { model: "Ignis GLX", yearFrom: 2016, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZNC","ZWG","ZZB"] },
      { model: "S-Presso", yearFrom: 2019, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZNC","ZZB","ZWG","26U"] },
      { model: "S-Presso S-Edition", yearFrom: 2020, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZNC","ZZB","26U"] },
      { model: "Ertiga", yearFrom: 2012, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA","26U"] },
      { model: "XL6", yearFrom: 2019, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA","ZQH"] },
      { model: "XL7", yearFrom: 1998, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZQH","26U"] },
      { model: "Fronx", yearFrom: 2023, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZWD","ZWG","ZVR"] },
      { model: "Fronx Turbo", yearFrom: 2023, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZWD","ZWG","ZVR"] },
      { model: "Ciaz", yearFrom: 2014, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA","26U"] },
      { model: "Alto", yearFrom: 1982, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","26U","ZWG"] },
      { model: "Alto K10", yearFrom: 2010, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","26U","ZWD"] },
      { model: "Alto 800", yearFrom: 2012, yearTo: 2024, codes: ["Z7T","Z2S","ZJ3","26U"] },
      { model: "Alto Lapin", yearFrom: 2002, yearTo: 2026, codes: ["Z7T","Z2S","ZVR","ZWY"] },
      { model: "SX4", yearFrom: 2006, yearTo: 2016, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA","26U"] },
      { model: "SX4 S-Cross", yearFrom: 2013, yearTo: 2022, codes: ["Z7T","Z2S","ZJ3","ZY4","ZWG","26U"] },
      { model: "S-Cross", yearFrom: 2021, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4","ZWG","ZVR"] },
      { model: "Super Carry", yearFrom: 1985, yearTo: 2026, codes: ["26U","Z2S"] },
      { model: "Carry", yearFrom: 1976, yearTo: 2026, codes: ["26U","Z2S"] },
      { model: "Every", yearFrom: 1982, yearTo: 2026, codes: ["26U","Z2S","Z7T"] },
      { model: "Every Wagon", yearFrom: 1999, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3"] },
      { model: "Wagon R", yearFrom: 1993, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","26U"] },
      { model: "Wagon R Stingray", yearFrom: 2007, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4"] },
      { model: "Splash", yearFrom: 2008, yearTo: 2015, codes: ["Z7T","Z2S","ZJ3","ZWG","26U"] },
      { model: "Kizashi", yearFrom: 2009, yearTo: 2016, codes: ["Z7T","Z2S","ZJ3","ZY4","ZNA"] },
      { model: "Samurai", yearFrom: 1981, yearTo: 2004, codes: ["26U","ZZC","Z2S"] },
      { model: "Sidekick", yearFrom: 1988, yearTo: 1998, codes: ["26U","Z2S","ZJ3"] },
      { model: "Across", yearFrom: 2020, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4"] },
      { model: "Swace", yearFrom: 2020, yearTo: 2026, codes: ["Z7T","Z2S","ZJ3","ZY4"] },
      { model: "APV", yearFrom: 2004, yearTo: 2025, codes: ["26U","Z2S","ZJ3"] },
      { model: "Cappuccino", yearFrom: 1991, yearTo: 1998, codes: ["26U","ZWD","Z2S"] },
      { model: "Liana", yearFrom: 2001, yearTo: 2008, codes: ["26U","Z2S","ZJ3"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FORD
  // ───────────────────────────────────────────────────────────────────────────
  Ford: {
    manufacturer: "Ford Motor Company",
    colours: [
      { code: "YZ", name: "Oxford White", hex: "#F4F4F4", finish: "Solid", notes: "Ford benchmark fleet & passenger solid white." },
      { code: "UM", name: "Agate Black Metallic", hex: "#151618", finish: "Metallic", notes: "Deep crystalline metallic black." },
      { code: "J7", name: "Magnetic Metallic", hex: "#4C4E51", finish: "Metallic", notes: "Iconic Ford mid-to-dark charcoal metallic." },
      { code: "UX", name: "Ingot Silver Metallic", hex: "#C2C5C7", finish: "Metallic", notes: "Classic bright silver metallic." },
      { code: "E7", name: "Velocity Blue Metallic", hex: "#134B88", finish: "Metallic", notes: "Vivid sports & truck electric blue metallic." },
      { code: "D4", name: "Rapid Red Metallic Tinted Clearcoat", hex: "#9B111E", finish: "Pearl", notes: "Premium multi-stage ruby red metallic." },
      { code: "PQ", name: "Race Red", hex: "#D1262B", finish: "Solid", notes: "Classic motorsport pure solid red." },
      { code: "JS", name: "Iconic Silver Metallic", hex: "#B8BABC", finish: "Metallic", notes: "Crisp modern light silver metallic." },
      { code: "M7", name: "Carbonized Grey Metallic", hex: "#43464A", finish: "Metallic", notes: "Modern architectural dark grey metallic." },
      { code: "NE", name: "Cactus Grey", hex: "#87938D", finish: "Solid", notes: "Trending flat-gloss sage pastel grey." },
      { code: "W6", name: "Area 51", hex: "#4D646D", finish: "Solid", notes: "Heritage military slate teal-blue solid." },
      { code: "FT", name: "Blue Metallic", hex: "#1A3B66", finish: "Metallic", notes: "Rich deep royal blue metallic." },
      { code: "CY", name: "Competition Orange", hex: "#E85D1A", finish: "Solid", notes: "High saturation solid muscle orange." },
      { code: "L6", name: "Grabber Blue", hex: "#2B7CB8", finish: "Solid", notes: "Legendary 1970s Grabber heritage solid blue." },
      { code: "CY2", name: "Cyber Orange Metallic Tricoat", hex: "#EE9A1C", finish: "Pearl", notes: "Bronco / Mustang Mach-E launch pearl orange." },
      { code: "PN", name: "Moondust Silver Metallic", hex: "#CACCCF", finish: "Metallic", notes: "European Ford long-standing light silver." },
      { code: "UG", name: "White Platinum Metallic Tricoat", hex: "#EFEFE8", finish: "Pearl", notes: "Luxury tricoat diamond pearl white." },
      { code: "UA", name: "Ebony Black", hex: "#0C0C0C", finish: "Solid", notes: "Deep non-metallic piano black." }
    ],
    models: [
      { model: "Ranger", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","E7","D4","PQ","NE"] },
      { model: "Ranger Raptor", yearFrom: 2018, yearTo: 2026, codes: ["YZ","UM","J7","M7","E7","D4","NE","PQ"] },
      { model: "Ranger Wildtrak", yearFrom: 2011, yearTo: 2026, codes: ["YZ","UM","J7","M7","CY2","D4","JS"] },
      { model: "Ranger XLT", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","D4"] },
      { model: "Ranger XL", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","UX","JS","J7"] },
      { model: "Ranger Single Cab", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","UX","JS"] },
      { model: "Ranger Super Cab", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","JS","M7"] },
      { model: "Ranger Double Cab", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","D4","E7"] },
      { model: "Ranger Stormtrak", yearFrom: 2021, yearTo: 2026, codes: ["D4","UM","YZ","JS"] },
      { model: "Everest", yearFrom: 2003, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","D4","UG"] },
      { model: "Everest Sport", yearFrom: 2019, yearTo: 2026, codes: ["YZ","UM","J7","M7","D4"] },
      { model: "Everest Platinum", yearFrom: 2022, yearTo: 2026, codes: ["YZ","UM","M7","D4","UG","JS"] },
      { model: "Everest Titanium", yearFrom: 2015, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","D4","UG"] },
      { model: "Everest XLT", yearFrom: 2003, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS"] },
      { model: "EcoSport", yearFrom: 2003, yearTo: 2024, codes: ["YZ","UM","J7","UX","E7","PQ","D4","PN"] },
      { model: "EcoSport Active", yearFrom: 2020, yearTo: 2024, codes: ["YZ","UM","J7","E7","D4"] },
      { model: "EcoSport Titanium", yearFrom: 2013, yearTo: 2024, codes: ["YZ","UM","J7","UX","D4","PN"] },
      { model: "EcoSport Trend", yearFrom: 2013, yearTo: 2024, codes: ["YZ","UM","J7","UX","PQ"] },
      { model: "EcoSport Ambiente", yearFrom: 2013, yearTo: 2024, codes: ["YZ","UM","UX"] },
      { model: "Fiesta", yearFrom: 1976, yearTo: 2024, codes: ["YZ","UM","J7","UX","E7","PQ","PN","D4"] },
      { model: "Fiesta ST", yearFrom: 2004, yearTo: 2024, codes: ["YZ","UM","J7","E7","PQ","CY","L6"] },
      { model: "Fiesta ST-Line", yearFrom: 2016, yearTo: 2024, codes: ["YZ","UM","J7","E7","PQ"] },
      { model: "Fiesta Active", yearFrom: 2018, yearTo: 2024, codes: ["YZ","UM","J7","E7","CY2"] },
      { model: "Fiesta Titanium", yearFrom: 2008, yearTo: 2024, codes: ["YZ","UM","J7","UX","PN","D4"] },
      { model: "Focus", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","E7","PQ","D4","PN"] },
      { model: "Focus ST", yearFrom: 2005, yearTo: 2026, codes: ["YZ","UM","J7","E7","PQ","CY","L6"] },
      { model: "Focus RS", yearFrom: 2002, yearTo: 2018, codes: ["YZ","UM","J7","E7","L6"] },
      { model: "Focus Active", yearFrom: 2018, yearTo: 2026, codes: ["YZ","UM","J7","JS","E7","D4"] },
      { model: "Focus Estate", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","D4"] },
      { model: "Focus Sedan", yearFrom: 1998, yearTo: 2020, codes: ["YZ","UM","J7","UX","D4"] },
      { model: "Figo", yearFrom: 2010, yearTo: 2022, codes: ["YZ","UM","UX","PQ","PN","D4"] },
      { model: "Figo Freestyle", yearFrom: 2018, yearTo: 2022, codes: ["YZ","UM","UX","PQ","CY2"] },
      { model: "Figo Sedan", yearFrom: 2015, yearTo: 2022, codes: ["YZ","UM","UX","PN"] },
      { model: "Territory", yearFrom: 2004, yearTo: 2026, codes: ["YZ","UM","J7","JS","M7","D4"] },
      { model: "Puma", yearFrom: 1997, yearTo: 2026, codes: ["YZ","UM","J7","JS","E7","D4","NE"] },
      { model: "Puma ST", yearFrom: 2020, yearTo: 2026, codes: ["YZ","UM","J7","E7","PQ"] },
      { model: "Kuga", yearFrom: 2008, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","D4","PN"] },
      { model: "Kuga Vignale", yearFrom: 2016, yearTo: 2026, codes: ["YZ","UM","UG","D4"] },
      { model: "Edge", yearFrom: 2006, yearTo: 2024, codes: ["YZ","UM","J7","UX","JS","D4","UG"] },
      { model: "Escape", yearFrom: 2000, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","E7","D4"] },
      { model: "Explorer", yearFrom: 1990, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","D4","UG"] },
      { model: "Explorer ST", yearFrom: 2019, yearTo: 2026, codes: ["YZ","UM","J7","M7","D4"] },
      { model: "Expedition", yearFrom: 1996, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","UG"] },
      { model: "Bronco", yearFrom: 1965, yearTo: 2026, codes: ["YZ","UM","NE","W6","CY2","E7","PQ","M7"] },
      { model: "Bronco Sport", yearFrom: 2020, yearTo: 2026, codes: ["YZ","UM","NE","W6","CY2","E7","PQ","M7"] },
      { model: "Bronco Raptor", yearFrom: 2022, yearTo: 2026, codes: ["YZ","UM","NE","CY2","M7"] },
      { model: "Mustang", yearFrom: 1964, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","E7","D4","PQ","CY","L6","UA"] },
      { model: "Mustang GT", yearFrom: 1982, yearTo: 2026, codes: ["YZ","UM","J7","JS","M7","E7","D4","PQ","CY","L6"] },
      { model: "Mustang Mach 1", yearFrom: 1969, yearTo: 2023, codes: ["YZ","UM","J7","JS","PQ","CY"] },
      { model: "Mustang Dark Horse", yearFrom: 2023, yearTo: 2026, codes: ["UM","M7","E7","L6"] },
      { model: "Mustang Mach-E", yearFrom: 2020, yearTo: 2026, codes: ["YZ","UM","J7","JS","E7","D4","CY2","L6"] },
      { model: "Mustang Shelby GT500", yearFrom: 1967, yearTo: 2023, codes: ["YZ","UM","J7","E7","PQ","L6"] },
      { model: "Mustang Shelby GT350", yearFrom: 1965, yearTo: 2020, codes: ["YZ","UM","J7","E7","PQ"] },
      { model: "F-150", yearFrom: 1975, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7","D4","UG"] },
      { model: "F-150 Raptor", yearFrom: 2010, yearTo: 2026, codes: ["YZ","UM","J7","M7","E7","NE"] },
      { model: "F-150 Lightning", yearFrom: 2021, yearTo: 2026, codes: ["YZ","UM","JS","M7","D4"] },
      { model: "F-250 Super Duty", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7"] },
      { model: "F-350 Super Duty", yearFrom: 1998, yearTo: 2026, codes: ["YZ","UM","J7","UX","JS","M7"] },
      { model: "Transit", yearFrom: 1965, yearTo: 2026, codes: ["YZ","UM","UX","JS","PN"] },
      { model: "Transit Custom", yearFrom: 2012, yearTo: 2026, codes: ["YZ","UM","UX","JS","PN","J7","D4"] },
      { model: "Transit Connect", yearFrom: 2002, yearTo: 2026, codes: ["YZ","UM","UX","JS","PN"] },
      { model: "Tourneo Custom", yearFrom: 2012, yearTo: 2026, codes: ["YZ","UM","UX","JS","PN","J7","D4"] },
      { model: "Tourneo Connect", yearFrom: 2002, yearTo: 2026, codes: ["YZ","UM","UX","JS","PN"] },
      { model: "Mondeo", yearFrom: 1992, yearTo: 2024, codes: ["YZ","UM","J7","UX","PN","D4"] },
      { model: "Fusion", yearFrom: 2005, yearTo: 2020, codes: ["YZ","UM","J7","UX","D4","UG"] },
      { model: "Falcon", yearFrom: 1960, yearTo: 2016, codes: ["YZ","UM","UX","PQ","FT"] },
      { model: "Falcon Ute", yearFrom: 1961, yearTo: 2016, codes: ["YZ","UM","UX","PQ"] },
      { model: "Taurus", yearFrom: 1985, yearTo: 2026, codes: ["YZ","UM","J7","UX","D4"] },
      { model: "Bantam", yearFrom: 1983, yearTo: 2011, codes: ["YZ","UX","UA","FT"] },
      { model: "Courier", yearFrom: 1972, yearTo: 2007, codes: ["YZ","UX","UA"] },
      { model: "Ikon", yearFrom: 1999, yearTo: 2015, codes: ["YZ","UX","PN"] },
      { model: "Ka", yearFrom: 1996, yearTo: 2021, codes: ["YZ","UX","PQ","PN"] },
      { model: "GT", yearFrom: 2004, yearTo: 2023, codes: ["YZ","UM","PQ","L6"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. NISSAN
  // ───────────────────────────────────────────────────────────────────────────
  Nissan: {
    manufacturer: "Nissan Motor Co., Ltd.",
    colours: [
      { code: "QM1", name: "Cloud White / Glacier White", hex: "#F6F6F6", finish: "Solid", notes: "High volume commercial & passenger solid white." },
      { code: "QAB", name: "Pearl White Tricoat", hex: "#EFEFE9", finish: "Pearl", notes: "Flagship Nissan multi-layer luxury pearl white." },
      { code: "KH3", name: "Super Black / Onyx", hex: "#0A0A0B", finish: "Solid", notes: "Deep non-metallic piano black." },
      { code: "G41", name: "Magnetic Black Pearl", hex: "#141517", finish: "Pearl", notes: "Deep crystal black metallic pearl." },
      { code: "K23", name: "Brilliant Silver Metallic", hex: "#C0C3C5", finish: "Metallic", notes: "Classic crisp silver metallic." },
      { code: "KAD", name: "Gun Metallic", hex: "#53565A", finish: "Metallic", notes: "Iconic Nissan deep charcoal gunmetal." },
      { code: "KBY", name: "Stealth Grey", hex: "#666C72", finish: "Solid", notes: "Navara Pro-4X / Nismo modern tactical solid grey." },
      { code: "RAY", name: "Deep Blue Pearl", hex: "#123163", finish: "Pearl", notes: "Rich dark royal blue pearl." },
      { code: "RBY", name: "Caspian Blue Metallic", hex: "#164273", finish: "Metallic", notes: "High chroma ocean blue metallic." },
      { code: "NAH", name: "Magnetic Red Metallic", hex: "#9B1C28", finish: "Metallic", notes: "Dynamic sports car ruby red metallic." },
      { code: "NBA", name: "Scarlet Ember Tintcoat", hex: "#871822", finish: "Pearl", notes: "Luxury deep candy red pearl." },
      { code: "EBB", name: "Monarch Orange Metallic", hex: "#C45520", finish: "Metallic", notes: "Vibrant burnt orange metallic." },
      { code: "EAU", name: "Ikina Sunset Orange", hex: "#B8471E", finish: "Pearl", notes: "Signature SUV dual-tone sunset orange." },
      { code: "RCN", name: "Ceramic Grey", hex: "#A2A7A9", finish: "Solid", notes: "Contemporary satin chalk grey." },
      { code: "BV4", name: "Intense Blue Metallic", hex: "#1E4F8A", finish: "Metallic", notes: "Athletic electric blue metallic." }
    ],
    models: [
      { model: "Navara", yearFrom: 1997, yearTo: 2026, codes: ["QM1","KH3","G41","K23","KAD","KBY","NAH","RAY"] },
      { model: "Navara Pro-4X", yearFrom: 2020, yearTo: 2026, codes: ["KBY","QM1","KH3","KAD","NAH"] },
      { model: "Navara Pro-2X", yearFrom: 2020, yearTo: 2026, codes: ["KBY","QM1","KH3","KAD","NAH"] },
      { model: "Navara SE", yearFrom: 2014, yearTo: 2026, codes: ["QM1","KH3","K23","KAD"] },
      { model: "Navara LE", yearFrom: 2014, yearTo: 2026, codes: ["QM1","G41","K23","KAD","NAH"] },
      { model: "Navara Single Cab", yearFrom: 1997, yearTo: 2026, codes: ["QM1","K23","KH3"] },
      { model: "Navara Double Cab", yearFrom: 1997, yearTo: 2026, codes: ["QM1","KH3","G41","K23","KAD","KBY","NAH"] },
      { model: "NP200", yearFrom: 2008, yearTo: 2024, codes: ["QM1","KH3","K23","KAD","NAH"] },
      { model: "NP300 Hardbody", yearFrom: 2002, yearTo: 2021, codes: ["QM1","KH3","K23","KAD"] },
      { model: "Hardbody", yearFrom: 1988, yearTo: 2008, codes: ["QM1","KH3","K23"] },
      { model: "1400 Bakkie", yearFrom: 1971, yearTo: 2008, codes: ["QM1","KH3","K23"] },
      { model: "Patrol", yearFrom: 1951, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD"] },
      { model: "Patrol Super Safari", yearFrom: 1997, yearTo: 2024, codes: ["QM1","QAB","G41","K23","KAD"] },
      { model: "Patrol Nismo", yearFrom: 2015, yearTo: 2026, codes: ["QAB","G41","KAD"] },
      { model: "Qashqai", yearFrom: 2006, yearTo: 2026, codes: ["QM1","QAB","KH3","G41","K23","KAD","RBY","NBA","EAU","RCN"] },
      { model: "Qashqai e-POWER", yearFrom: 2022, yearTo: 2026, codes: ["QAB","G41","KAD","RBY","RCN"] },
      { model: "Qashqai Ti", yearFrom: 2014, yearTo: 2026, codes: ["QAB","G41","KAD","NBA"] },
      { model: "Qashqai Acenta", yearFrom: 2006, yearTo: 2026, codes: ["QM1","G41","K23","KAD","RBY"] },
      { model: "X-Trail", yearFrom: 2000, yearTo: 2026, codes: ["QM1","QAB","KH3","G41","K23","KAD","RBY","NBA","EAU"] },
      { model: "X-Trail e-POWER", yearFrom: 2022, yearTo: 2026, codes: ["QAB","G41","KAD","RBY","NBA"] },
      { model: "Magnite", yearFrom: 2020, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD","NAH","EBB"] },
      { model: "Magnite Red Edition", yearFrom: 2022, yearTo: 2026, codes: ["NAH","QM1","G41"] },
      { model: "Almera", yearFrom: 1995, yearTo: 2026, codes: ["QM1","KH3","K23","KAD","NAH"] },
      { model: "Micra", yearFrom: 1982, yearTo: 2026, codes: ["QM1","QAB","KH3","G41","K23","KAD","EBB","BV4"] },
      { model: "Micra Active", yearFrom: 2017, yearTo: 2022, codes: ["QM1","KH3","K23","KAD"] },
      { model: "Juke", yearFrom: 2010, yearTo: 2026, codes: ["QM1","QAB","KH3","G41","K23","KAD","NAH","EAU"] },
      { model: "Juke Nismo", yearFrom: 2013, yearTo: 2019, codes: ["QAB","KH3","KAD"] },
      { model: "Kicks", yearFrom: 2016, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD","EBB"] },
      { model: "GT-R", yearFrom: 2007, yearTo: 2025, codes: ["QAB","G41","KAD","RAY","KBY"] },
      { model: "GT-R Nismo", yearFrom: 2014, yearTo: 2025, codes: ["QAB","G41","KBY"] },
      { model: "350Z", yearFrom: 2002, yearTo: 2009, codes: ["QM1","KH3","K23","RAY"] },
      { model: "370Z", yearFrom: 2009, yearTo: 2020, codes: ["QAB","KH3","G41","K23","KAD","NAH","RAY"] },
      { model: "370Z Nismo", yearFrom: 2009, yearTo: 2020, codes: ["QAB","KH3","KAD","NAH"] },
      { model: "Z (400Z)", yearFrom: 2022, yearTo: 2026, codes: ["QAB","G41","KAD","KBY","EAU","BV4"] },
      { model: "Pathfinder", yearFrom: 1985, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD","RAY","NBA"] },
      { model: "Terra", yearFrom: 2018, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD","NAH"] },
      { model: "Murano", yearFrom: 2002, yearTo: 2024, codes: ["QM1","QAB","KH3","G41","K23","KAD"] },
      { model: "Armada", yearFrom: 2003, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD"] },
      { model: "Titan", yearFrom: 2003, yearTo: 2024, codes: ["QM1","QAB","G41","K23","KAD"] },
      { model: "Frontier", yearFrom: 1997, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD","KBY"] },
      { model: "Leaf", yearFrom: 2010, yearTo: 2026, codes: ["QM1","QAB","G41","K23","KAD","RAY"] },
      { model: "Ariya", yearFrom: 2020, yearTo: 2026, codes: ["QAB","G41","KAD","EAU","RCN"] },
      { model: "Sentra", yearFrom: 1982, yearTo: 2026, codes: ["QM1","QAB","KH3","G41","K23","KAD"] },
      { model: "Tiida", yearFrom: 2004, yearTo: 2018, codes: ["QM1","KH3","K23","KAD"] },
      { model: "Livina", yearFrom: 2006, yearTo: 2019, codes: ["QM1","KH3","K23","KAD"] },
      { model: "Grand Livina", yearFrom: 2007, yearTo: 2019, codes: ["QM1","KH3","K23","KAD"] },
      { model: "Livina X-Gear", yearFrom: 2008, yearTo: 2019, codes: ["QM1","KH3","K23","KAD","NAH"] },
      { model: "NV200", yearFrom: 2009, yearTo: 2024, codes: ["QM1","K23","KH3"] },
      { model: "NV350 Impendulo", yearFrom: 2012, yearTo: 2026, codes: ["QM1","K23"] },
      { model: "NV350 Caravan", yearFrom: 2012, yearTo: 2026, codes: ["QM1","K23","KH3"] },
      { model: "Urvan", yearFrom: 1968, yearTo: 2012, codes: ["QM1","K23"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. KIA
  // ───────────────────────────────────────────────────────────────────────────
  Kia: {
    manufacturer: "Kia Corporation",
    colours: [
      { code: "UD", name: "Clear White", hex: "#F8F9FA", finish: "Solid", notes: "Kia primary global solid clean white." },
      { code: "SWP", name: "Snow White Pearl", hex: "#F0F1EE", finish: "Pearl", notes: "Multi-stage luxury crystalline white pearl." },
      { code: "ABP", name: "Aurora Black Pearl", hex: "#131416", finish: "Pearl", notes: "Rich deep metallic pearl black." },
      { code: "EB", name: "Ebony Black", hex: "#0C0C0D", finish: "Solid", notes: "Classic piano solid black." },
      { code: "4SS", name: "Silky Silver Metallic", hex: "#C5C7CA", finish: "Metallic", notes: "Bright crisp silver metallic." },
      { code: "KLG", name: "Steel Grey Metallic", hex: "#6B7075", finish: "Metallic", notes: "Modern mid-grey architectural metallic." },
      { code: "CSS", name: "Cyber Grey Metallic", hex: "#8C9196", finish: "Metallic", notes: "Modern flat-sheen urban grey." },
      { code: "M6Y", name: "Mineral Blue Metallic", hex: "#24466B", finish: "Metallic", notes: "Sophisticated deep oceanic blue." },
      { code: "B3L", name: "Blue Flame Metallic", hex: "#1B589D", finish: "Metallic", notes: "Sporty electric blue metallic." },
      { code: "CR5", name: "Runway Red Metallic", hex: "#9F1824", finish: "Metallic", notes: "Signature Kia launch sports red metallic." },
      { code: "AA4", name: "Infra Red Metallic", hex: "#931720", finish: "Metallic", notes: "Deep ruby red metallic." },
      { code: "MYW", name: "Matte Shadow Grey", hex: "#4C4F54", finish: "Matte", notes: "EV6 / Stinger factory satin matte grey." },
      { code: "EU3", name: "Sparkling Silver Metallic", hex: "#B8BABC", finish: "Metallic", notes: "High reflectivity platinum silver." },
      { code: "H8G", name: "Gravity Grey Metallic", hex: "#484B4F", finish: "Metallic", notes: "Deep charcoal graphite metallic." },
      { code: "BBL", name: "Yacht Blue Metallic", hex: "#183359", finish: "Metallic", notes: "EV6 flagship yacht navy blue metallic." }
    ],
    models: [
      { model: "Picanto", yearFrom: 2004, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","M6Y","CR5","AA4"] },
      { model: "Picanto X-Line", yearFrom: 2017, yearTo: 2026, codes: ["UD","SWP","ABP","KLG","CR5"] },
      { model: "Picanto GT-Line", yearFrom: 2017, yearTo: 2026, codes: ["UD","SWP","ABP","CR5","M6Y"] },
      { model: "Picanto Street", yearFrom: 2011, yearTo: 2026, codes: ["UD","ABP","4SS","CR5"] },
      { model: "Picanto Style", yearFrom: 2017, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","M6Y"] },
      { model: "Rio", yearFrom: 2000, yearTo: 2024, codes: ["UD","SWP","ABP","4SS","KLG","B3L","CR5"] },
      { model: "Rio Sedan", yearFrom: 2000, yearTo: 2024, codes: ["UD","SWP","ABP","4SS","KLG"] },
      { model: "Rio Hatch", yearFrom: 2000, yearTo: 2024, codes: ["UD","SWP","ABP","4SS","KLG","B3L","CR5"] },
      { model: "Rio GT-Line", yearFrom: 2018, yearTo: 2024, codes: ["UD","SWP","ABP","B3L","CR5"] },
      { model: "Sonet", yearFrom: 2020, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","M6Y","CR5"] },
      { model: "Sonet EX", yearFrom: 2020, yearTo: 2026, codes: ["UD","SWP","ABP","KLG","CR5"] },
      { model: "Sonet LX", yearFrom: 2020, yearTo: 2026, codes: ["UD","ABP","4SS"] },
      { model: "Seltos", yearFrom: 2019, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","M6Y","CR5","H8G"] },
      { model: "Seltos GT-Line", yearFrom: 2019, yearTo: 2026, codes: ["UD","SWP","ABP","KLG","CR5"] },
      { model: "Seltos EX", yearFrom: 2019, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG"] },
      { model: "Sportage", yearFrom: 1993, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","H8G","M6Y","CR5"] },
      { model: "Sportage GT-Line", yearFrom: 2016, yearTo: 2026, codes: ["UD","SWP","ABP","KLG","M6Y","CR5"] },
      { model: "Sportage Hybrid", yearFrom: 2021, yearTo: 2026, codes: ["UD","SWP","ABP","KLG","H8G","M6Y"] },
      { model: "Sorento", yearFrom: 2002, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","H8G","M6Y"] },
      { model: "Sorento SX", yearFrom: 2015, yearTo: 2026, codes: ["SWP","ABP","KLG","H8G","M6Y"] },
      { model: "Sorento Hybrid", yearFrom: 2020, yearTo: 2026, codes: ["SWP","ABP","KLG","H8G","M6Y"] },
      { model: "Carnival", yearFrom: 1998, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","H8G","M6Y"] },
      { model: "Sedona", yearFrom: 1998, yearTo: 2021, codes: ["UD","SWP","ABP","4SS","KLG"] },
      { model: "Pegas", yearFrom: 2017, yearTo: 2026, codes: ["UD","ABP","4SS","KLG","CR5"] },
      { model: "Stinger", yearFrom: 2017, yearTo: 2023, codes: ["SWP","ABP","4SS","KLG","CR5","MYW"] },
      { model: "Stinger GT", yearFrom: 2017, yearTo: 2023, codes: ["SWP","ABP","CR5","MYW"] },
      { model: "EV6", yearFrom: 2021, yearTo: 2026, codes: ["SWP","ABP","MYW","KLG","BBL","CR5"] },
      { model: "EV6 GT", yearFrom: 2022, yearTo: 2026, codes: ["SWP","ABP","MYW","BBL","CR5"] },
      { model: "EV9", yearFrom: 2023, yearTo: 2026, codes: ["SWP","ABP","MYW","KLG","BBL"] },
      { model: "EV9 GT-Line", yearFrom: 2023, yearTo: 2026, codes: ["SWP","ABP","MYW","KLG"] },
      { model: "EV3", yearFrom: 2024, yearTo: 2026, codes: ["SWP","ABP","KLG","B3L"] },
      { model: "Niro", yearFrom: 2016, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","M6Y"] },
      { model: "Niro EV", yearFrom: 2018, yearTo: 2026, codes: ["SWP","ABP","KLG","M6Y"] },
      { model: "Cerato", yearFrom: 2003, yearTo: 2024, codes: ["UD","SWP","ABP","4SS","KLG","CR5"] },
      { model: "Cerato Koup", yearFrom: 2009, yearTo: 2016, codes: ["UD","SWP","ABP","CR5"] },
      { model: "Forte", yearFrom: 2008, yearTo: 2024, codes: ["UD","SWP","ABP","4SS","KLG","CR5"] },
      { model: "K5", yearFrom: 2010, yearTo: 2026, codes: ["UD","SWP","ABP","4SS","KLG","CR5"] },
      { model: "Optima", yearFrom: 2000, yearTo: 2020, codes: ["UD","SWP","ABP","4SS","KLG"] },
      { model: "Soul", yearFrom: 2008, yearTo: 2024, codes: ["UD","SWP","ABP","4SS","CR5","B3L"] },
      { model: "Telluride", yearFrom: 2019, yearTo: 2026, codes: ["SWP","ABP","KLG","H8G"] },
      { model: "K2500", yearFrom: 1997, yearTo: 2026, codes: ["UD","4SS"] },
      { model: "K2700", yearFrom: 1997, yearTo: 2026, codes: ["UD","4SS"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. HYUNDAI
  // ───────────────────────────────────────────────────────────────────────────
  Hyundai: {
    manufacturer: "Hyundai Motor Company",
    colours: [
      { code: "PSW", name: "Polar White", hex: "#F7F8FA", finish: "Solid", notes: "Core Hyundai high-volume solid white." },
      { code: "WAW", name: "Atlas White", hex: "#F5F5F3", finish: "Solid", notes: "Modern crisp solid white." },
      { code: "MZH", name: "Phantom Black Pearl", hex: "#121315", finish: "Pearl", notes: "Signature Hyundai crystalline black pearl." },
      { code: "A2B", name: "Abyss Black Pearl", hex: "#0F1012", finish: "Pearl", notes: "Deep modern obsidian black pearl." },
      { code: "T8T", name: "Typhoon Silver Metallic", hex: "#BFC2C5", finish: "Metallic", notes: "Crisp bright silver metallic." },
      { code: "V3G", name: "Star Dust Metallic", hex: "#4A4D51", finish: "Metallic", notes: "Deep charcoal metallic grey." },
      { code: "C5G", name: "Cyber Grey Metallic", hex: "#878C91", finish: "Metallic", notes: "Modern architectural flat-sheen metallic grey." },
      { code: "R4R", name: "Fiery Red Metallic", hex: "#A41924", finish: "Metallic", notes: "Sporty vibrant metallic red." },
      { code: "X2R", name: "Red Passion Metallic", hex: "#8C1620", finish: "Metallic", notes: "Rich wine-red metallic." },
      { code: "UB7", name: "Aqua Turquoise Metallic", hex: "#1D6B82", finish: "Metallic", notes: "Vibrant Mediterranean turquoise blue." },
      { code: "W6H", name: "Performance Blue", hex: "#7CA1BF", finish: "Solid", notes: "Hyundai N Division signature motorsport baby blue." },
      { code: "N3S", name: "Shadow Grey", hex: "#6B7277", finish: "Solid", notes: "N Line non-metallic battleship grey." },
      { code: "PE2", name: "Amazon Grey Metallic", hex: "#3F4743", finish: "Metallic", notes: "Modern Tucson launch deep olive-grey metallic." },
      { code: "U4G", name: "Titan Grey Metallic", hex: "#5B5E63", finish: "Metallic", notes: "Contemporary satin grey metallic." },
      { code: "WW8", name: "White Cream Tricoat", hex: "#EDEDE4", finish: "Pearl", notes: "Luxury multi-stage cream pearl white." }
    ],
    models: [
      { model: "Atos", yearFrom: 1997, yearTo: 2023, codes: ["PSW","MZH","T8T","R4R"] },
      { model: "Getz", yearFrom: 2002, yearTo: 2011, codes: ["PSW","MZH","T8T","R4R"] },
      { model: "i10", yearFrom: 2007, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R","UB7"] },
      { model: "Grand i10", yearFrom: 2013, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R","UB7","C5G"] },
      { model: "Grand i10 Sedan", yearFrom: 2014, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R"] },
      { model: "Grand i10 Fluid", yearFrom: 2018, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R","UB7"] },
      { model: "Grand i10 Motion", yearFrom: 2018, yearTo: 2026, codes: ["PSW","WAW","T8T"] },
      { model: "i20", yearFrom: 2008, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","R4R","UB7","C5G","W6H"] },
      { model: "i20 N", yearFrom: 2020, yearTo: 2026, codes: ["W6H","PSW","MZH","R4R","N3S"] },
      { model: "i20 Active", yearFrom: 2015, yearTo: 2020, codes: ["PSW","MZH","T8T","R4R"] },
      { model: "i20 Fluid", yearFrom: 2014, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R","UB7"] },
      { model: "i20 Motion", yearFrom: 2014, yearTo: 2026, codes: ["PSW","WAW","T8T"] },
      { model: "i30", yearFrom: 2007, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","V3G","R4R","W6H","N3S"] },
      { model: "i30 N", yearFrom: 2017, yearTo: 2026, codes: ["W6H","N3S","PSW","MZH","R4R"] },
      { model: "i30 Fastback", yearFrom: 2017, yearTo: 2024, codes: ["W6H","N3S","PSW","MZH","T8T"] },
      { model: "Accent", yearFrom: 1994, yearTo: 2024, codes: ["PSW","WAW","MZH","T8T","V3G","R4R"] },
      { model: "Accent Sedan", yearFrom: 1994, yearTo: 2024, codes: ["PSW","WAW","MZH","T8T","V3G"] },
      { model: "Elantra", yearFrom: 1990, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","V3G","R4R","W6H"] },
      { model: "Elantra N", yearFrom: 2021, yearTo: 2026, codes: ["W6H","N3S","PSW","A2B","R4R"] },
      { model: "Sonata", yearFrom: 1985, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","V3G"] },
      { model: "Creta", yearFrom: 2015, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","V3G","R4R","C5G"] },
      { model: "Creta Grand", yearFrom: 2021, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","V3G"] },
      { model: "Creta Executive", yearFrom: 2016, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R"] },
      { model: "Venue", yearFrom: 2019, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","R4R","UB7","C5G"] },
      { model: "Venue Glide", yearFrom: 2019, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","R4R"] },
      { model: "Venue Motion", yearFrom: 2019, yearTo: 2026, codes: ["PSW","WAW","T8T"] },
      { model: "Kona", yearFrom: 2017, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","R4R","UB7","C5G","W6H"] },
      { model: "Kona N", yearFrom: 2021, yearTo: 2024, codes: ["W6H","N3S","PSW","A2B"] },
      { model: "Kona Electric", yearFrom: 2018, yearTo: 2026, codes: ["WAW","A2B","C5G","UB7"] },
      { model: "Tucson", yearFrom: 2004, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","V3G","R4R","PE2","C5G","U4G"] },
      { model: "Tucson N Line", yearFrom: 2019, yearTo: 2026, codes: ["WAW","A2B","N3S","R4R"] },
      { model: "Tucson Elite", yearFrom: 2015, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","PE2","C5G"] },
      { model: "Tucson Executive", yearFrom: 2015, yearTo: 2026, codes: ["PSW","WAW","MZH","T8T","V3G"] },
      { model: "Santa Fe", yearFrom: 2000, yearTo: 2026, codes: ["PSW","WAW","MZH","A2B","T8T","V3G","PE2","WW8"] },
      { model: "Palisade", yearFrom: 2018, yearTo: 2026, codes: ["WAW","A2B","T8T","V3G","WW8"] },
      { model: "Staria", yearFrom: 2021, yearTo: 2026, codes: ["PSW","WAW","A2B","T8T","V3G","C5G"] },
      { model: "Staria Multicab", yearFrom: 2021, yearTo: 2026, codes: ["PSW","WAW","A2B","T8T"] },
      { model: "Staria Panel Van", yearFrom: 2021, yearTo: 2026, codes: ["PSW","T8T"] },
      { model: "Staria Executive", yearFrom: 2021, yearTo: 2026, codes: ["PSW","WAW","A2B","T8T","C5G"] },
      { model: "Staria Luxury", yearFrom: 2021, yearTo: 2026, codes: ["WAW","A2B","V3G","C5G"] },
      { model: "H-1", yearFrom: 1997, yearTo: 2021, codes: ["PSW","MZH","T8T"] },
      { model: "H-1 Wagon", yearFrom: 2008, yearTo: 2021, codes: ["PSW","MZH","T8T"] },
      { model: "H-1 Panel Van", yearFrom: 2008, yearTo: 2021, codes: ["PSW","T8T"] },
      { model: "H-100 Bakkie", yearFrom: 1977, yearTo: 2026, codes: ["PSW"] },
      { model: "Tiburon", yearFrom: 1996, yearTo: 2008, codes: ["PSW","MZH","T8T","R4R"] },
      { model: "Veloster", yearFrom: 2011, yearTo: 2022, codes: ["PSW","MZH","T8T","R4R","W6H"] },
      { model: "Ioniq 5", yearFrom: 2021, yearTo: 2026, codes: ["WAW","A2B","C5G","W6H"] },
      { model: "Ioniq 5 N", yearFrom: 2023, yearTo: 2026, codes: ["W6H","WAW","A2B"] },
      { model: "Ioniq 6", yearFrom: 2022, yearTo: 2026, codes: ["WAW","A2B","C5G","T8T"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. MERCEDES-BENZ
  // ───────────────────────────────────────────────────────────────────────────
  "Mercedes-Benz": {
    manufacturer: "Mercedes-Benz AG",
    colours: [
      { code: "149", name: "Polar White", hex: "#F7F8F9", finish: "Solid", notes: "Flagship global Mercedes-Benz non-metallic solid white." },
      { code: "799", name: "Designo Diamond White Bright", hex: "#F0F1EE", finish: "Pearl", notes: "Multi-stage luxury crystalline diamond white pearl." },
      { code: "197", name: "Obsidian Black Metallic", hex: "#141517", finish: "Metallic", notes: "Benchmark high-volume Mercedes deep obsidian black." },
      { code: "040", name: "Black (Schwarz)", hex: "#0A0A0A", finish: "Solid", notes: "Deep non-metallic piano black." },
      { code: "775", name: "Iridium Silver Metallic", hex: "#C5C7C9", finish: "Metallic", notes: "Classic heritage German silver arrows metallic." },
      { code: "992", name: "Selenite Grey Metallic", hex: "#505458", finish: "Metallic", notes: "Sophisticated mid-dark charcoal grey metallic." },
      { code: "297", name: "Designo Selenite Grey Magno", hex: "#4C5054", finish: "Matte", notes: "AMG signature satin factory matte grey." },
      { code: "890", name: "Cavansite Blue Metallic", hex: "#152B4D", finish: "Metallic", notes: "Rich prestige dark navy sapphire metallic." },
      { code: "896", name: "Brilliant Blue Metallic", hex: "#16467A", finish: "Metallic", notes: "Vivid sports line electric blue metallic." },
      { code: "996", name: "Designo Hyacinth Red Metallic", hex: "#8B1824", finish: "Metallic", notes: "Multi-stage luminous ruby candy red metallic." },
      { code: "831", name: "Graphite Grey Metallic", hex: "#383C40", finish: "Metallic", notes: "High depth graphite anthracite metallic." },
      { code: "970", name: "Spectral Blue Metallic", hex: "#1A3E72", finish: "Metallic", notes: "Modern electric blue metallic." },
      { code: "982", name: "Designo Monza Grey Magno", hex: "#5F6367", finish: "Matte", notes: "SLS AMG / GT matte grey." },
      { code: "044", name: "Designo Magno Alanite Grey", hex: "#7F8488", finish: "Matte", notes: "Light satin matte silver-grey." },
      { code: "589", name: "Jupiter Red", hex: "#BD1B26", finish: "Solid", notes: "Compact sports car high-gloss pure solid red." },
      { code: "696", name: "Night Black", hex: "#0F0F11", finish: "Solid", notes: "A-Class / CLA solid deep black." },
      { code: "914", name: "Sun Yellow", hex: "#F3C31A", finish: "Solid", notes: "A35 AMG launch vibrant yellow." },
      { code: "217", name: "Green Hell Magno", hex: "#4F863E", finish: "Matte", notes: "AMG GT R Nürburgring signature satin matte green." }
    ],
    models: [
      { model: "A-Class", yearFrom: 1997, yearTo: 2026, codes: ["149","197","775","992","896","996","589","696","914"] },
      { model: "A-Class Hatchback", yearFrom: 1997, yearTo: 2026, codes: ["149","197","775","992","896","589","914"] },
      { model: "A-Class Sedan", yearFrom: 2018, yearTo: 2026, codes: ["149","197","775","992","896","996"] },
      { model: "A35 AMG", yearFrom: 2018, yearTo: 2026, codes: ["149","197","914","589","992","297"] },
      { model: "A45 AMG", yearFrom: 2013, yearTo: 2026, codes: ["149","197","914","589","297"] },
      { model: "A45 S AMG", yearFrom: 2019, yearTo: 2026, codes: ["149","197","914","589","297"] },
      { model: "B-Class", yearFrom: 2005, yearTo: 2026, codes: ["149","197","775","992","890"] },
      { model: "C-Class", yearFrom: 1993, yearTo: 2026, codes: ["149","799","197","040","775","992","297","890","896","996","831","970"] },
      { model: "C-Class Sedan", yearFrom: 1993, yearTo: 2026, codes: ["149","799","197","040","775","992","890","996","831"] },
      { model: "C-Class Estate", yearFrom: 1996, yearTo: 2026, codes: ["149","197","775","992","890"] },
      { model: "C-Class Coupe", yearFrom: 2011, yearTo: 2023, codes: ["149","799","197","992","297","996","896"] },
      { model: "C-Class Cabriolet", yearFrom: 2016, yearTo: 2023, codes: ["149","799","197","992","996"] },
      { model: "C43 AMG", yearFrom: 2015, yearTo: 2026, codes: ["149","197","992","297","896","996"] },
      { model: "C63 AMG", yearFrom: 2008, yearTo: 2026, codes: ["149","197","992","297","996","831"] },
      { model: "C63 S AMG", yearFrom: 2015, yearTo: 2026, codes: ["149","197","992","297","996","831"] },
      { model: "CLA", yearFrom: 2013, yearTo: 2026, codes: ["149","197","775","992","896","996","589","696","914"] },
      { model: "CLA Coupe", yearFrom: 2013, yearTo: 2026, codes: ["149","197","775","992","896","996","589"] },
      { model: "CLA Shooting Brake", yearFrom: 2015, yearTo: 2026, codes: ["149","197","775","992","896"] },
      { model: "CLA35 AMG", yearFrom: 2019, yearTo: 2026, codes: ["149","197","914","589","297"] },
      { model: "CLA45 AMG", yearFrom: 2013, yearTo: 2026, codes: ["149","197","914","589","297"] },
      { model: "CLS", yearFrom: 2004, yearTo: 2023, codes: ["149","799","197","775","992","297","890","996"] },
      { model: "CLS Coupe", yearFrom: 2004, yearTo: 2023, codes: ["149","799","197","775","992","890","996"] },
      { model: "CLE", yearFrom: 2023, yearTo: 2026, codes: ["149","799","197","992","297","970","996"] },
      { model: "CLE Coupe", yearFrom: 2023, yearTo: 2026, codes: ["149","799","197","992","297","970"] },
      { model: "CLE Cabriolet", yearFrom: 2024, yearTo: 2026, codes: ["149","799","197","992","970","996"] },
      { model: "E-Class", yearFrom: 1993, yearTo: 2026, codes: ["149","799","197","040","775","992","890","831","970","996"] },
      { model: "E-Class Sedan", yearFrom: 1993, yearTo: 2026, codes: ["149","799","197","040","775","992","890","831"] },
      { model: "E-Class Estate", yearFrom: 1993, yearTo: 2026, codes: ["149","197","775","992","890"] },
      { model: "E-Class Coupe", yearFrom: 2009, yearTo: 2023, codes: ["149","799","197","992","297","996"] },
      { model: "E-Class Cabriolet", yearFrom: 2010, yearTo: 2023, codes: ["149","799","197","992","996"] },
      { model: "E53 AMG", yearFrom: 2018, yearTo: 2026, codes: ["149","197","992","297","831","970"] },
      { model: "E63 AMG", yearFrom: 2006, yearTo: 2026, codes: ["149","197","992","297","831"] },
      { model: "E63 S AMG", yearFrom: 2013, yearTo: 2026, codes: ["149","197","992","297","831"] },
      { model: "S-Class", yearFrom: 1972, yearTo: 2026, codes: ["149","799","197","040","775","992","890","831"] },
      { model: "S-Class Sedan", yearFrom: 1972, yearTo: 2026, codes: ["149","799","197","040","775","992","890","831"] },
      { model: "S-Class Coupe", yearFrom: 2014, yearTo: 2020, codes: ["799","197","992","890"] },
      { model: "S63 AMG", yearFrom: 2006, yearTo: 2026, codes: ["149","197","992","297","831"] },
      { model: "Maybach S-Class", yearFrom: 2015, yearTo: 2026, codes: ["799","197","040","775","992"] },
      { model: "SL", yearFrom: 1954, yearTo: 2026, codes: ["149","799","197","775","992","297","896","996","914"] },
      { model: "SL55 AMG", yearFrom: 2001, yearTo: 2026, codes: ["149","197","992","297","996"] },
      { model: "SL63 AMG", yearFrom: 2008, yearTo: 2026, codes: ["149","197","992","297","996"] },
      { model: "SLC", yearFrom: 2016, yearTo: 2020, codes: ["149","197","775","992","996"] },
      { model: "SLK", yearFrom: 1996, yearTo: 2016, codes: ["149","197","775","992","589"] },
      { model: "SLS AMG", yearFrom: 2010, yearTo: 2014, codes: ["149","197","775","982","044"] },
      { model: "AMG GT", yearFrom: 2014, yearTo: 2026, codes: ["149","197","992","297","896","996","914","217"] },
      { model: "AMG GT R", yearFrom: 2016, yearTo: 2021, codes: ["217","149","197","297","914"] },
      { model: "AMG GT 4-Door", yearFrom: 2018, yearTo: 2026, codes: ["149","197","992","297","831","970"] },
      { model: "GLA", yearFrom: 2013, yearTo: 2026, codes: ["149","197","775","992","896","996","589"] },
      { model: "GLB", yearFrom: 2019, yearTo: 2026, codes: ["149","197","775","992","896"] },
      { model: "GLC", yearFrom: 2015, yearTo: 2026, codes: ["149","799","197","040","775","992","890","996","831","970"] },
      { model: "GLC Coupe", yearFrom: 2016, yearTo: 2026, codes: ["149","799","197","992","297","996","970"] },
      { model: "GLC43 AMG", yearFrom: 2016, yearTo: 2026, codes: ["149","197","992","297","996"] },
      { model: "GLC63 AMG", yearFrom: 2017, yearTo: 2026, codes: ["149","197","992","297","831"] },
      { model: "GLE", yearFrom: 1997, yearTo: 2026, codes: ["149","799","197","040","775","992","890","996","831"] },
      { model: "GLE Coupe", yearFrom: 2015, yearTo: 2026, codes: ["149","799","197","992","297","996"] },
      { model: "GLE53 AMG", yearFrom: 2019, yearTo: 2026, codes: ["149","197","992","297","996"] },
      { model: "GLE63 AMG", yearFrom: 2015, yearTo: 2026, codes: ["149","197","992","297","831"] },
      { model: "GLS", yearFrom: 2006, yearTo: 2026, codes: ["149","799","197","040","775","992","890","831"] },
      { model: "GLS63 AMG", yearFrom: 2012, yearTo: 2026, codes: ["149","197","992","831"] },
      { model: "G-Class", yearFrom: 1979, yearTo: 2026, codes: ["149","197","040","992","297","831","589"] },
      { model: "G63 AMG", yearFrom: 2012, yearTo: 2026, codes: ["149","197","040","992","297","831"] },
      { model: "X-Class", yearFrom: 2017, yearTo: 2020, codes: ["149","197","775","992","890"] },
      { model: "V-Class", yearFrom: 1996, yearTo: 2026, codes: ["149","197","775","992","890"] },
      { model: "Vito", yearFrom: 1996, yearTo: 2026, codes: ["149","040","775","992"] },
      { model: "Sprinter", yearFrom: 1995, yearTo: 2026, codes: ["149","040","775"] },
      { model: "EQA", yearFrom: 2021, yearTo: 2026, codes: ["149","197","775","992"] },
      { model: "EQB", yearFrom: 2021, yearTo: 2026, codes: ["149","197","775","992"] },
      { model: "EQC", yearFrom: 2019, yearTo: 2024, codes: ["149","197","775","992"] },
      { model: "EQE", yearFrom: 2022, yearTo: 2026, codes: ["149","197","775","992","831"] },
      { model: "EQS", yearFrom: 2021, yearTo: 2026, codes: ["149","799","197","775","992","831"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 7. CITROËN
  // ───────────────────────────────────────────────────────────────────────────
  "Citroën": {
    manufacturer: "Citroën (Stellantis)",
    colours: [
      { code: "EWP", name: "Banquise White (Blanc Banquise)", hex: "#F7F8FA", finish: "Solid", notes: "Core non-metallic French pure white." },
      { code: "KWE", name: "Nacre White (Blanc Nacré)", hex: "#EFF0EC", finish: "Pearl", notes: "Premium multi-layer pearl white." },
      { code: "EXY", name: "Noir Onyx (Onyx Black)", hex: "#0A0A0A", finish: "Solid", notes: "Deep solid French non-metallic black." },
      { code: "KTV", name: "Perla Nera Black Metallic", hex: "#131416", finish: "Metallic", notes: "Signature black metallic with fine mica pearl." },
      { code: "KCA", name: "Gris Artense Metallic (Artense Grey)", hex: "#929598", finish: "Metallic", notes: "Modern crisp silver-grey metallic." },
      { code: "KTP", name: "Gris Shark / Platinum Grey Metallic", hex: "#474A4D", finish: "Metallic", notes: "Deep charcoal graphite metallic." },
      { code: "KGN", name: "Bourrasque Blue Metallic", hex: "#1B355B", finish: "Metallic", notes: "Rich dark navy metallic." },
      { code: "KJF", name: "Rouge Aden (Aden Red)", hex: "#BD1822", finish: "Solid", notes: "High gloss vibrant solid red." },
      { code: "M0VL", name: "Elixir Red Metallic", hex: "#87141E", finish: "Metallic", notes: "Signature multi-stage ruby red metallic." },
      { code: "EFC", name: "Blanc Perle Nacré", hex: "#F2F3EE", finish: "Pearl", notes: "High luminance pearl white." },
      { code: "EEH", name: "Gris Haria Metallic", hex: "#535659", finish: "Metallic", notes: "Dark warm grey metallic." },
      { code: "KGY", name: "Bleu Encre Metallic", hex: "#182C48", finish: "Metallic", notes: "Deep ink-blue metallic." },
      { code: "EPY", name: "Bleu Spring Metallic", hex: "#2A5A88", finish: "Metallic", notes: "Bright oceanic blue metallic." },
      { code: "KHC", name: "Jaune Pegase", hex: "#E8B923", finish: "Solid", notes: "Classic sports line solid bright yellow." }
    ],
    models: [
      { model: "C1", yearFrom: 2005, yearTo: 2022, codes: ["EWP","EXY","KCA","KJF","EPY"] },
      { model: "C2", yearFrom: 2003, yearTo: 2009, codes: ["EWP","EXY","KCA","KJF","KHC"] },
      { model: "C2 VTS", yearFrom: 2004, yearTo: 2009, codes: ["EWP","EXY","KJF","KHC"] },
      { model: "C3", yearFrom: 2002, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","EPY"] },
      { model: "C3 Aircross", yearFrom: 2017, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL"] },
      { model: "C3 Pluriel", yearFrom: 2003, yearTo: 2010, codes: ["EWP","EXY","KCA","EPY"] },
      { model: "C3 Picasso", yearFrom: 2008, yearTo: 2017, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "C3 You", yearFrom: 2021, yearTo: 2026, codes: ["EWP","KTV","KCA"] },
      { model: "C4", yearFrom: 2004, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","KGY"] },
      { model: "C4 Cactus", yearFrom: 2014, yearTo: 2020, codes: ["EWP","KWE","KTV","KCA","KTP","KJF"] },
      { model: "C4 Aircross", yearFrom: 2012, yearTo: 2017, codes: ["EWP","KWE","KTV","KCA"] },
      { model: "C4 Picasso", yearFrom: 2006, yearTo: 2018, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "Grand C4 Picasso", yearFrom: 2006, yearTo: 2018, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "C4 Spacetourer", yearFrom: 2018, yearTo: 2022, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "C4 X", yearFrom: 2022, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M0VL"] },
      { model: "ë-C4", yearFrom: 2020, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M0VL"] },
      { model: "C5", yearFrom: 2001, yearTo: 2017, codes: ["EWP","KWE","KTV","KCA","KTP","KGN"] },
      { model: "C5 Aircross", yearFrom: 2017, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL"] },
      { model: "C5 X", yearFrom: 2021, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M0VL"] },
      { model: "C6", yearFrom: 2005, yearTo: 2012, codes: ["EWP","KTV","KTP","KGN"] },
      { model: "Berlingo", yearFrom: 1996, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "Berlingo Multispace", yearFrom: 1996, yearTo: 2018, codes: ["EWP","KTV","KCA","KTP","EPY"] },
      { model: "Dispatch / Jumpy", yearFrom: 1994, yearTo: 2026, codes: ["EWP","KTV","KCA"] },
      { model: "Relay / Jumper", yearFrom: 1993, yearTo: 2026, codes: ["EWP","KTV","KCA"] },
      { model: "Spacetourer", yearFrom: 2016, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "DS3", yearFrom: 2009, yearTo: 2016, codes: ["EWP","KWE","KTV","KCA","KJF","KHC"] },
      { model: "DS3 Racing", yearFrom: 2010, yearTo: 2015, codes: ["EXY","EWP"] },
      { model: "DS4", yearFrom: 2011, yearTo: 2018, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "DS5", yearFrom: 2011, yearTo: 2018, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "Xsara", yearFrom: 1997, yearTo: 2006, codes: ["EWP","EXY","KCA","KJF"] },
      { model: "Xsara Picasso", yearFrom: 1999, yearTo: 2012, codes: ["EWP","EXY","KCA","KTP"] },
      { model: "Saxo", yearFrom: 1996, yearTo: 2004, codes: ["EWP","EXY","KCA","KJF","KHC"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 8. PEUGEOT
  // ───────────────────────────────────────────────────────────────────────────
  Peugeot: {
    manufacturer: "Automobiles Peugeot (Stellantis)",
    colours: [
      { code: "EWP", name: "Bianca White (Blanc Banquise)", hex: "#F8F9FA", finish: "Solid", notes: "Core solid non-metallic white." },
      { code: "KWE", name: "Pearl White (Blanc Nacré)", hex: "#EFF0EC", finish: "Pearl", notes: "Signature French luxury pearl white." },
      { code: "KTV", name: "Perla Nera Black Metallic", hex: "#131416", finish: "Metallic", notes: "Rich metallic black with fine mica pearl." },
      { code: "EXY", name: "Onyx Black (Noir Onyx)", hex: "#0B0B0C", finish: "Solid", notes: "Deep solid French non-metallic black." },
      { code: "KCA", name: "Artense Grey Metallic (Gris Artense)", hex: "#939699", finish: "Metallic", notes: "Crisp architectural silver metallic." },
      { code: "KTP", name: "Platinum Grey Metallic (Gris Platinium)", hex: "#484B4E", finish: "Metallic", notes: "Deep charcoal graphite metallic." },
      { code: "M0VL", name: "Elixir Red Metallic", hex: "#87141E", finish: "Metallic", notes: "Multi-stage candy ruby red metallic." },
      { code: "M0SM", name: "Vertigo Blue Metallic (Bleu Vertigo)", hex: "#0F498A", finish: "Metallic", notes: "High vibrancy sports electric blue." },
      { code: "KHK", name: "Orange Fusion Metallic", hex: "#D1561D", finish: "Metallic", notes: "2008 launch dynamic burnt orange." },
      { code: "M09V", name: "Cumulus Grey Metallic (Gris Cumulus)", hex: "#868B90", finish: "Metallic", notes: "Mid-tone metallic grey." },
      { code: "M0KL", name: "Faro Yellow Metallic (Jaune Faro)", hex: "#D6A824", finish: "Metallic", notes: "208 launch signature radiant yellow." },
      { code: "M01J", name: "Selenium Grey (Gris Selenium)", hex: "#5E646A", finish: "Solid", notes: "508 PSE tactical motorsport flat grey." },
      { code: "M06S", name: "Okenite White Metallic", hex: "#E5E8EB", finish: "Metallic", notes: "Modern crisp metallic white." },
      { code: "M0G8", name: "Ingaro Blue Metallic", hex: "#22374E", finish: "Metallic", notes: "Deep navy metallic." }
    ],
    models: [
      { model: "107", yearFrom: 2005, yearTo: 2014, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "108", yearFrom: 2014, yearTo: 2021, codes: ["EWP","KTV","KCA","M0VL"] },
      { model: "206", yearFrom: 1998, yearTo: 2012, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "206 CC", yearFrom: 2000, yearTo: 2007, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "206 GTi", yearFrom: 1999, yearTo: 2006, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "207", yearFrom: 2006, yearTo: 2014, codes: ["EWP","EXY","KCA","KTP","M0VL"] },
      { model: "207 CC", yearFrom: 2007, yearTo: 2015, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "208", yearFrom: 2012, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","M0SM","M0KL"] },
      { model: "208 GTi", yearFrom: 2013, yearTo: 2019, codes: ["EWP","KWE","KTV","M0VL"] },
      { model: "208 GT-Line", yearFrom: 2015, yearTo: 2026, codes: ["EWP","KWE","KTV","M0SM","M0VL","M0KL"] },
      { model: "208 Allure", yearFrom: 2012, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "e-208", yearFrom: 2019, yearTo: 2026, codes: ["EWP","KWE","KTV","M0SM","M0KL"] },
      { model: "301", yearFrom: 2012, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "306", yearFrom: 1993, yearTo: 2002, codes: ["EWP","EXY","KCA"] },
      { model: "307", yearFrom: 2001, yearTo: 2008, codes: ["EWP","EXY","KCA","KTP"] },
      { model: "307 CC", yearFrom: 2003, yearTo: 2008, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "308", yearFrom: 2007, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","M0SM","M06S"] },
      { model: "308 GTi", yearFrom: 2015, yearTo: 2021, codes: ["EWP","KWE","KTV","M0VL"] },
      { model: "308 SW", yearFrom: 2008, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0SM"] },
      { model: "406", yearFrom: 1995, yearTo: 2004, codes: ["EWP","EXY","KCA"] },
      { model: "406 Coupe", yearFrom: 1997, yearTo: 2004, codes: ["EWP","EXY","KCA","M0VL"] },
      { model: "407", yearFrom: 2004, yearTo: 2011, codes: ["EWP","EXY","KCA","KTP"] },
      { model: "408", yearFrom: 2010, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M0VL","M0SM"] },
      { model: "508", yearFrom: 2010, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","M01J"] },
      { model: "508 SW", yearFrom: 2011, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL"] },
      { model: "508 PSE", yearFrom: 2020, yearTo: 2026, codes: ["M01J","EWP","KTV"] },
      { model: "2008", yearFrom: 2013, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","M0SM","KHK"] },
      { model: "2008 GT-Line", yearFrom: 2016, yearTo: 2026, codes: ["EWP","KWE","KTV","M0SM","KHK","M0VL"] },
      { model: "e-2008", yearFrom: 2019, yearTo: 2026, codes: ["EWP","KWE","KTV","M0SM","KHK"] },
      { model: "3008", yearFrom: 2008, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL","M06S"] },
      { model: "3008 GT", yearFrom: 2016, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M0VL"] },
      { model: "3008 Hybrid", yearFrom: 2019, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M06S"] },
      { model: "4008", yearFrom: 2012, yearTo: 2017, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "5008", yearFrom: 2009, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP","M0VL"] },
      { model: "5008 GT", yearFrom: 2017, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","M0VL"] },
      { model: "Landtrek", yearFrom: 2020, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "Landtrek 4x4", yearFrom: 2020, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "Landtrek Double Cab", yearFrom: 2020, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "RCZ", yearFrom: 2010, yearTo: 2015, codes: ["EWP","KWE","KTV","KCA","M0VL"] },
      { model: "Partner", yearFrom: 1996, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "Partner Tepee", yearFrom: 2008, yearTo: 2018, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "Rifter", yearFrom: 2018, yearTo: 2026, codes: ["EWP","KTV","KCA","KTP"] },
      { model: "Expert", yearFrom: 1995, yearTo: 2026, codes: ["EWP","KTV","KCA"] },
      { model: "Traveller", yearFrom: 2016, yearTo: 2026, codes: ["EWP","KWE","KTV","KCA","KTP"] },
      { model: "Boxer", yearFrom: 1994, yearTo: 2026, codes: ["EWP","KTV","KCA"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 9. FAW
  // ───────────────────────────────────────────────────────────────────────────
  FAW: {
    manufacturer: "FAW Group Corporation",
    colours: [
      { code: "FAW01", name: "Glacier White / Signal White", hex: "#F5F6F7", finish: "Solid", notes: "Core commercial & passenger solid signal white." },
      { code: "FAW02", name: "Crystal Jet Black", hex: "#0F1012", finish: "Solid", notes: "Deep non-metallic black." },
      { code: "FAW03", name: "Silver Metallic", hex: "#B8BABC", finish: "Metallic", notes: "Bright crisp silver metallic." },
      { code: "FAW04", name: "Flame Red Metallic", hex: "#A81B26", finish: "Metallic", notes: "Vibrant rich red metallic." },
      { code: "FAW05", name: "Sky Blue Metallic", hex: "#295B8C", finish: "Metallic", notes: "Classic royal/sky blue metallic." },
      { code: "FAW06", name: "Titanium Grey Metallic", hex: "#55585C", finish: "Metallic", notes: "Deep charcoal graphite metallic." },
      { code: "FAW07", name: "Diamond White Pearl", hex: "#EEEFEA", finish: "Pearl", notes: "Multi-stage pearl white." },
      { code: "FAW08", name: "Golden Sand Metallic", hex: "#B59E75", finish: "Metallic", notes: "Warm gold metallic." },
      { code: "FAW09", name: "Imperial Blue", hex: "#152744", finish: "Solid", notes: "Deep navy truck cab blue." }
    ],
    models: [
      { model: "V2", yearFrom: 2012, yearTo: 2022, codes: ["FAW01","FAW02","FAW03","FAW04","FAW05"] },
      { model: "V2 1.3 Comfort", yearFrom: 2013, yearTo: 2022, codes: ["FAW01","FAW02","FAW03","FAW04"] },
      { model: "V2 1.3 #Vibe", yearFrom: 2015, yearTo: 2020, codes: ["FAW01","FAW03","FAW04"] },
      { model: "Sirius", yearFrom: 2011, yearTo: 2020, codes: ["FAW01","FAW02","FAW03","FAW04"] },
      { model: "Sirius S80", yearFrom: 2013, yearTo: 2020, codes: ["FAW01","FAW02","FAW03","FAW04"] },
      { model: "Carrier", yearFrom: 2008, yearTo: 2024, codes: ["FAW01","FAW03"] },
      { model: "Carrier 1.3 Single Cab", yearFrom: 2008, yearTo: 2024, codes: ["FAW01"] },
      { model: "Carrier 1.3 Double Cab", yearFrom: 2010, yearTo: 2024, codes: ["FAW01","FAW03"] },
      { model: "Carrier Panel Van", yearFrom: 2010, yearTo: 2024, codes: ["FAW01"] },
      { model: "X-PV", yearFrom: 2010, yearTo: 2022, codes: ["FAW01","FAW03"] },
      { model: "6.130 FL", yearFrom: 2010, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "6.130 FL Tipper", yearFrom: 2012, yearTo: 2026, codes: ["FAW01"] },
      { model: "8.140 FL", yearFrom: 2012, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "8.140 FD", yearFrom: 2014, yearTo: 2026, codes: ["FAW01","FAW09"] },
      { model: "15.180 FL", yearFrom: 2010, yearTo: 2026, codes: ["FAW01","FAW09"] },
      { model: "15.180 FT", yearFrom: 2012, yearTo: 2026, codes: ["FAW01"] },
      { model: "16.240 FL", yearFrom: 2014, yearTo: 2026, codes: ["FAW01","FAW09"] },
      { model: "28.280 FD", yearFrom: 2010, yearTo: 2026, codes: ["FAW01"] },
      { model: "28.330 FL", yearFrom: 2012, yearTo: 2026, codes: ["FAW01"] },
      { model: "28.380 FT", yearFrom: 2012, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "33.340 FD", yearFrom: 2012, yearTo: 2026, codes: ["FAW01"] },
      { model: "33.420 FT", yearFrom: 2014, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "J5N", yearFrom: 2008, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "J6P", yearFrom: 2012, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "JH6 500FT", yearFrom: 2018, yearTo: 2026, codes: ["FAW01","FAW04","FAW06","FAW09"] },
      { model: "Tiger V", yearFrom: 2016, yearTo: 2026, codes: ["FAW01","FAW04","FAW09"] },
      { model: "Besturn B50", yearFrom: 2009, yearTo: 2019, codes: ["FAW01","FAW02","FAW03","FAW06"] },
      { model: "Besturn X80", yearFrom: 2013, yearTo: 2020, codes: ["FAW01","FAW02","FAW03","FAW04","FAW06"] },
      { model: "Hongqi H5", yearFrom: 2017, yearTo: 2026, codes: ["FAW01","FAW02","FAW03","FAW06","FAW07"] },
      { model: "Hongqi H9", yearFrom: 2020, yearTo: 2026, codes: ["FAW02","FAW06","FAW07","FAW08"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 10. CHEVROLET
  // ───────────────────────────────────────────────────────────────────────────
  Chevrolet: {
    manufacturer: "General Motors (Chevrolet)",
    colours: [
      { code: "WA8624", name: "Olympic White / Summit White", hex: "#F6F7F8", finish: "Solid", notes: "GM global high-volume clean solid white." },
      { code: "WA8555", name: "Black / Onyx Black", hex: "#0A0A0A", finish: "Solid", notes: "Classic GM deep non-metallic black." },
      { code: "WA636R", name: "Silver Ice Metallic / Switchblade Silver", hex: "#BDC0C2", finish: "Metallic", notes: "Bright crisp metallic silver." },
      { code: "WA139X", name: "Son of a Gun Grey / Nightfall Grey Metallic", hex: "#46484C", finish: "Metallic", notes: "Deep charcoal metallic grey." },
      { code: "WA705S", name: "Red Hot / Pull Me Over Red", hex: "#BA1622", finish: "Solid", notes: "Dynamic high-gloss pure solid red." },
      { code: "WA412P", name: "Blue Velvet Metallic", hex: "#162C4E", finish: "Metallic", notes: "Rich prestige dark navy metallic." },
      { code: "WA895T", name: "Satin Steel Metallic", hex: "#6B7177", finish: "Metallic", notes: "Modern mid-grey architectural metallic." },
      { code: "WA130X", name: "Velvet Red Metallic", hex: "#871926", finish: "Metallic", notes: "Deep ruby candy metallic." },
      { code: "WA410Y", name: "Flash Red", hex: "#CC2229", finish: "Solid", notes: "Spark / Sonic bright solid red." },
      { code: "WA405Y", name: "Crush Orange", hex: "#E05315", finish: "Solid", notes: "High saturation muscle car orange." },
      { code: "WA434B", name: "Shadow Grey Metallic", hex: "#38424B", finish: "Metallic", notes: "Dark slate graphite metallic." },
      { code: "WA9414", name: "Velocity Yellow", hex: "#EBBF1A", finish: "Solid", notes: "Iconic Corvette motorsport yellow." },
      { code: "WA433P", name: "Blue Ray Metallic", hex: "#173860", finish: "Metallic", notes: "Deep electric blue metallic." }
    ],
    models: [
      { model: "Utility", yearFrom: 2004, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA139X","WA705S","WA412P"] },
      { model: "Utility 1.4", yearFrom: 2004, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA705S"] },
      { model: "Utility 1.4 Club", yearFrom: 2004, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA139X"] },
      { model: "Utility 1.4 Sport", yearFrom: 2004, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA705S","WA139X"] },
      { model: "Utility 1.8 Club", yearFrom: 2004, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA139X"] },
      { model: "Utility 1.8 Sport", yearFrom: 2004, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA705S","WA139X"] },
      { model: "Corsa Utility", yearFrom: 2000, yearTo: 2010, codes: ["WA8624","WA8555","WA636R","WA705S"] },
      { model: "Spark", yearFrom: 2003, yearTo: 2022, codes: ["WA8624","WA8555","WA636R","WA410Y","WA405Y"] },
      { model: "Spark Lite", yearFrom: 2009, yearTo: 2016, codes: ["WA8624","WA636R","WA410Y"] },
      { model: "Spark 1.0", yearFrom: 2003, yearTo: 2017, codes: ["WA8624","WA8555","WA636R"] },
      { model: "Spark 1.2", yearFrom: 2010, yearTo: 2017, codes: ["WA8624","WA8555","WA636R","WA410Y"] },
      { model: "Spark Pronto", yearFrom: 2013, yearTo: 2017, codes: ["WA8624","WA636R"] },
      { model: "Aveo", yearFrom: 2002, yearTo: 2020, codes: ["WA8624","WA8555","WA636R","WA705S","WA412P"] },
      { model: "Aveo Sedan", yearFrom: 2005, yearTo: 2020, codes: ["WA8624","WA8555","WA636R","WA412P"] },
      { model: "Aveo5 Hatchback", yearFrom: 2006, yearTo: 2014, codes: ["WA8624","WA8555","WA636R","WA705S"] },
      { model: "Sonic", yearFrom: 2011, yearTo: 2020, codes: ["WA8624","WA8555","WA636R","WA139X","WA705S","WA412P"] },
      { model: "Sonic Sedan", yearFrom: 2011, yearTo: 2020, codes: ["WA8624","WA8555","WA636R","WA139X"] },
      { model: "Sonic Hatch", yearFrom: 2011, yearTo: 2020, codes: ["WA8624","WA8555","WA636R","WA705S","WA412P"] },
      { model: "Sonic RS", yearFrom: 2013, yearTo: 2017, codes: ["WA8624","WA8555","WA705S","WA139X"] },
      { model: "Cruze", yearFrom: 2008, yearTo: 2023, codes: ["WA8624","WA8555","WA636R","WA139X","WA705S","WA412P","WA895T"] },
      { model: "Cruze Sedan", yearFrom: 2008, yearTo: 2023, codes: ["WA8624","WA8555","WA636R","WA139X","WA412P"] },
      { model: "Cruze Hatch", yearFrom: 2011, yearTo: 2019, codes: ["WA8624","WA8555","WA636R","WA705S","WA139X"] },
      { model: "Captiva", yearFrom: 2006, yearTo: 2018, codes: ["WA8624","WA8555","WA636R","WA139X","WA412P"] },
      { model: "Trailblazer", yearFrom: 2001, yearTo: 2026, codes: ["WA8624","WA8555","WA636R","WA139X","WA895T","WA412P"] },
      { model: "Lumina", yearFrom: 1998, yearTo: 2013, codes: ["WA8624","WA8555","WA636R","WA705S","WA412P"] },
      { model: "Lumina SS", yearFrom: 2001, yearTo: 2013, codes: ["WA8624","WA8555","WA636R","WA705S"] },
      { model: "Lumina SS Ute", yearFrom: 2003, yearTo: 2013, codes: ["WA8624","WA8555","WA636R","WA705S"] },
      { model: "Optra", yearFrom: 2002, yearTo: 2014, codes: ["WA8624","WA8555","WA636R"] },
      { model: "Orlando", yearFrom: 2011, yearTo: 2018, codes: ["WA8624","WA8555","WA636R","WA139X"] },
      { model: "Silverado", yearFrom: 1998, yearTo: 2026, codes: ["WA8624","WA8555","WA636R","WA139X","WA895T","WA705S"] },
      { model: "Silverado 1500", yearFrom: 1998, yearTo: 2026, codes: ["WA8624","WA8555","WA636R","WA139X","WA895T"] },
      { model: "Colorado", yearFrom: 2003, yearTo: 2026, codes: ["WA8624","WA8555","WA636R","WA139X","WA705S"] },
      { model: "Tahoe", yearFrom: 1995, yearTo: 2026, codes: ["WA8624","WA8555","WA636R","WA139X","WA895T"] },
      { model: "Suburban", yearFrom: 1935, yearTo: 2026, codes: ["WA8624","WA8555","WA636R","WA139X","WA895T"] },
      { model: "Corvette", yearFrom: 1953, yearTo: 2026, codes: ["WA8624","WA8555","WA705S","WA9414","WA405Y","WA433P","WA139X"] },
      { model: "Corvette Stingray", yearFrom: 1963, yearTo: 2026, codes: ["WA8624","WA8555","WA705S","WA9414","WA433P"] },
      { model: "Corvette Z06", yearFrom: 2001, yearTo: 2026, codes: ["WA8624","WA8555","WA705S","WA9414"] },
      { model: "Camaro", yearFrom: 1966, yearTo: 2024, codes: ["WA8624","WA8555","WA636R","WA139X","WA705S","WA405Y","WA9414"] },
      { model: "Camaro SS", yearFrom: 1967, yearTo: 2024, codes: ["WA8624","WA8555","WA705S","WA405Y","WA139X"] },
      { model: "Camaro ZL1", yearFrom: 2012, yearTo: 2024, codes: ["WA8624","WA8555","WA705S","WA139X"] }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 11. HAVAL & GWM / HAVAL
  // ───────────────────────────────────────────────────────────────────────────
  "GWM / Haval": {
    manufacturer: "Great Wall Motor Co., Ltd.",
    colours: [
      { code: "GW01", name: "Hamilton White", hex: "#F7F8FA", finish: "Solid", notes: "Core crisp high-gloss solid white." },
      { code: "GW02", name: "Sun Black", hex: "#0C0D0E", finish: "Solid", notes: "Deep non-metallic piano black." },
      { code: "GW03", name: "Ayers Grey Metallic", hex: "#6B7075", finish: "Metallic", notes: "Flagship architectural slate grey metallic." },
      { code: "GW04", name: "Crystal Black Metallic", hex: "#131416", finish: "Metallic", notes: "Deep crystalline metallic black with pearl flake." },
      { code: "GW05", name: "Mars Red Metallic", hex: "#A31924", finish: "Metallic", notes: "Dynamic vibrant candy red metallic." },
      { code: "GW06", name: "Atlantis Blue Metallic", hex: "#18467A", finish: "Metallic", notes: "Deep vivid Mediterranean blue metallic." },
      { code: "GW07", name: "Pittsburgh Silver Metallic", hex: "#C0C3C6", finish: "Metallic", notes: "Bright crisp metallic silver." },
      { code: "GW08", name: "Cocoa Brown Metallic", hex: "#4C3C35", finish: "Metallic", notes: "Rich luxury metallic espresso brown." },
      { code: "GW09", name: "Kuqa Gold Metallic", hex: "#B89B65", finish: "Metallic", notes: "Warm desert champagne gold metallic." },
      { code: "GW10", name: "Gobi Desert Green", hex: "#3F5243", finish: "Solid", notes: "Tactical solid off-road green." },
      { code: "GW11", name: "Aurora Green Metallic", hex: "#245A46", finish: "Metallic", notes: "Rich emerald forest green metallic." },
      { code: "GW12", name: "Celadon Blue Metallic", hex: "#386C82", finish: "Metallic", notes: "Contemporary satin pastel cyan metallic." }
    ],
    models: [
      { model: "Haval Jolion", yearFrom: 2020, yearTo: 2026, codes: ["GW01","GW02","GW03","GW04","GW05","GW06","GW07"] },
      { model: "Haval Jolion Luxury", yearFrom: 2021, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05","GW06"] },
      { model: "Haval Jolion Premium", yearFrom: 2021, yearTo: 2026, codes: ["GW01","GW03","GW04","GW07"] },
      { model: "Haval Jolion Super Luxury", yearFrom: 2021, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05","GW06"] },
      { model: "Haval Jolion S", yearFrom: 2022, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05"] },
      { model: "Haval Jolion Pro", yearFrom: 2024, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05","GW06"] },
      { model: "Haval Jolion HEV", yearFrom: 2022, yearTo: 2026, codes: ["GW01","GW03","GW04","GW06"] },
      { model: "Haval H6", yearFrom: 2011, yearTo: 2026, codes: ["GW01","GW02","GW03","GW04","GW05","GW06","GW07","GW08"] },
      { model: "Haval H6 Luxury", yearFrom: 2017, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05","GW06"] },
      { model: "Haval H6 Super Luxury", yearFrom: 2017, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05","GW06"] },
      { model: "Haval H6 4WD", yearFrom: 2017, yearTo: 2026, codes: ["GW01","GW03","GW04"] },
      { model: "Haval H6 GT", yearFrom: 2021, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05"] },
      { model: "Haval H6 HEV", yearFrom: 2022, yearTo: 2026, codes: ["GW01","GW03","GW04","GW06"] },
      { model: "Haval H6 PHEV", yearFrom: 2022, yearTo: 2026, codes: ["GW01","GW03","GW04","GW06"] },
      { model: "Haval H1", yearFrom: 2014, yearTo: 2021, codes: ["GW01","GW02","GW05","GW07"] },
      { model: "Haval H2", yearFrom: 2014, yearTo: 2021, codes: ["GW01","GW02","GW03","GW05","GW07"] },
      { model: "Haval H2 Facelift", yearFrom: 2019, yearTo: 2021, codes: ["GW01","GW03","GW05"] },
      { model: "Haval H4", yearFrom: 2017, yearTo: 2021, codes: ["GW01","GW03","GW05"] },
      { model: "Haval H7", yearFrom: 2015, yearTo: 2021, codes: ["GW01","GW03","GW04"] },
      { model: "Haval H8", yearFrom: 2013, yearTo: 2018, codes: ["GW01","GW03","GW04"] },
      { model: "Haval H9", yearFrom: 2014, yearTo: 2026, codes: ["GW01","GW02","GW03","GW04","GW07"] },
      { model: "Haval H9 4WD", yearFrom: 2014, yearTo: 2026, codes: ["GW01","GW03","GW04"] },
      { model: "Haval Dargo", yearFrom: 2020, yearTo: 2026, codes: ["GW01","GW03","GW04","GW10","GW05"] },
      { model: "GWM P-Series", yearFrom: 2019, yearTo: 2026, codes: ["GW01","GW02","GW03","GW04","GW05","GW06","GW07"] },
      { model: "GWM P-Series Commercial", yearFrom: 2019, yearTo: 2026, codes: ["GW01","GW02","GW07"] },
      { model: "GWM P-Series Passenger", yearFrom: 2019, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05","GW06"] },
      { model: "GWM P-Series LTD", yearFrom: 2022, yearTo: 2026, codes: ["GW01","GW03","GW04","GW05"] },
      { model: "GWM Steed 5", yearFrom: 2011, yearTo: 2024, codes: ["GW01","GW02","GW07"] },
      { model: "GWM Steed 5 Single Cab", yearFrom: 2011, yearTo: 2024, codes: ["GW01","GW07"] },
      { model: "GWM Steed 5 Double Cab", yearFrom: 2011, yearTo: 2024, codes: ["GW01","GW02","GW07"] },
      { model: "GWM Steed 5E", yearFrom: 2014, yearTo: 2024, codes: ["GW01","GW02","GW07"] },
      { model: "GWM Steed 6", yearFrom: 2014, yearTo: 2020, codes: ["GW01","GW02","GW03","GW07"] },
      { model: "Tank 300", yearFrom: 2020, yearTo: 2026, codes: ["GW01","GW02","GW03","GW05","GW10"] },
      { model: "Tank 300 HEV", yearFrom: 2023, yearTo: 2026, codes: ["GW01","GW03","GW05","GW10"] },
      { model: "Tank 500", yearFrom: 2021, yearTo: 2026, codes: ["GW01","GW03","GW04","GW07","GW09"] },
      { model: "Ora 03", yearFrom: 2020, yearTo: 2026, codes: ["GW01","GW03","GW06","GW11","GW12"] }
    ]
  }
};

// Also mirror "GWM / Haval" under "Haval" brand key so users/APIs querying brand="Haval" find Haval & GWM models directly
BRANDS_DATA["Haval"] = {
  manufacturer: "Haval (Great Wall Motor)",
  colours: BRANDS_DATA["GWM / Haval"].colours,
  models: BRANDS_DATA["GWM / Haval"].models
};

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

console.log("==================================================");
console.log("TRUECOLOURS — REMAINING BRANDS POPULATION ENGINE");
console.log("==================================================");

const targetBrandKeys = Object.keys(BRANDS_DATA);
console.log(`Configured brands: ${targetBrandKeys.join(", ")}`);

// 1. Process data/raw/oem-paint-codes.json
const oemCodesPath = path.join(ROOT, "data/raw/oem-paint-codes.json");
let oemCodes = JSON.parse(fs.readFileSync(oemCodesPath, "utf8"));

// Filter out old records for the target brands
const targetBrandNamesUpper = targetBrandKeys.map(b => b.toUpperCase());
oemCodes = oemCodes.filter(r => !targetBrandNamesUpper.includes(r.brand.toUpperCase()));

let totalAddedOemCodes = 0;
for (const brandName of targetBrandKeys) {
  const brandInfo = BRANDS_DATA[brandName];
  const colourMap = new Map();
  for (const c of brandInfo.colours) colourMap.set(c.code, c);

  for (const m of brandInfo.models) {
    for (const code of m.codes) {
      const c = colourMap.get(code);
      if (!c) continue;

      oemCodes.push({
        brand: brandName,
        model: m.model,
        yearFrom: m.yearFrom,
        yearTo: m.yearTo,
        code: c.code,
        name: c.name,
        finish: c.finish,
        hex: c.hex,
        source: "open-data",
        verified: false,
        notes: c.notes || undefined
      });
      totalAddedOemCodes++;
    }
  }
}

fs.writeFileSync(oemCodesPath, JSON.stringify(oemCodes, null, 2), "utf8");
console.log(`✔ data/raw/oem-paint-codes.json updated with ${totalAddedOemCodes} new records. Total: ${oemCodes.length}`);

// 2. Process data/raw/vehicles-catalogue.json
const vcPath = path.join(ROOT, "data/raw/vehicles-catalogue.json");
let vc = JSON.parse(fs.readFileSync(vcPath, "utf8"));

for (const brandName of targetBrandKeys) {
  const brandInfo = BRANDS_DATA[brandName];
  let foundBrand = vc.brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
  if (!foundBrand) {
    foundBrand = { name: brandName, models: [] };
    vc.brands.push(foundBrand);
  } else {
    foundBrand.models = [];
  }

  for (const m of brandInfo.models) {
    const years = [];
    for (let y = m.yearFrom; y <= m.yearTo; y++) years.push(y);
    foundBrand.models.push({ name: m.model, years });
  }
}

fs.writeFileSync(vcPath, JSON.stringify(vc, null, 2), "utf8");
console.log(`✔ data/raw/vehicles-catalogue.json updated for all brands.`);

// 3. Process data/raw/oem-paint-catalogue.json
const catPath = path.join(ROOT, "data/raw/oem-paint-catalogue.json");
let catalogue = JSON.parse(fs.readFileSync(catPath, "utf8"));
catalogue = catalogue.filter(r => !targetBrandNamesUpper.includes(r.brand.toUpperCase()));

let totalAddedCatalogue = 0;
for (const brandName of targetBrandKeys) {
  const brandInfo = BRANDS_DATA[brandName];
  const colourMap = new Map();
  for (const c of brandInfo.colours) colourMap.set(c.code, c);

  for (const m of brandInfo.models) {
    const years = [];
    for (let y = m.yearFrom; y <= m.yearTo; y++) years.push(y);

    for (const code of m.codes) {
      const c = colourMap.get(code);
      if (!c) continue;

      catalogue.push({
        brand: brandName,
        manufacturer: brandInfo.manufacturer,
        model: m.model,
        yearFrom: m.yearFrom,
        yearTo: m.yearTo,
        years,
        code: c.code,
        primaryCode: c.code,
        salesCodes: [],
        name: c.name,
        finish: c.finish,
        hex: c.hex,
        swatchHex: c.hex,
        swatchSource: "OEM Formulation Approximation",
        swatchVerified: false,
        alternativeNames: [{ language: "en", name: c.name }],
        source: "open-data",
        sourceUrl: "https://truecolourspaints.co.za/catalogue",
        sourceLicense: "Open Automotive Data Standard",
        verified: false,
        notes: c.notes || undefined
      });
      totalAddedCatalogue++;
    }
  }
}

fs.writeFileSync(catPath, JSON.stringify(catalogue, null, 2), "utf8");
console.log(`✔ data/raw/oem-paint-catalogue.json updated with ${totalAddedCatalogue} new records. Total: ${catalogue.length}`);

// 4. Update data/paint-codes-data.ts
const tsPath = path.join(ROOT, "data/paint-codes-data.ts");
let tsContent = fs.readFileSync(tsPath, "utf8");

// Generate TypeScript blocks for each brand
for (const brandName of targetBrandKeys) {
  const brandInfo = BRANDS_DATA[brandName];
  const colourMap = new Map();
  for (const c of brandInfo.colours) colourMap.set(c.code, c);

  let brandTs = `  {\n    brand: ${JSON.stringify(brandName)},\n    models: [\n`;
  for (const m of brandInfo.models) {
    brandTs += `      {\n        model: ${JSON.stringify(m.model)},\n        colors: [\n`;
    for (const code of m.codes) {
      const c = colourMap.get(code);
      if (!c) continue;
      brandTs += `          { code: ${JSON.stringify(c.code)}, name: ${JSON.stringify(c.name)}, hex: ${JSON.stringify(c.hex)}, yearFrom: ${m.yearFrom}, yearTo: ${m.yearTo}, verified: false, finish: ${JSON.stringify(c.finish)}, market: 'South Africa', manufacturer: ${JSON.stringify(brandInfo.manufacturer)}`;
      if (c.notes) {
        brandTs += `, notes: ${JSON.stringify(c.notes)}`;
      }
      brandTs += ` },\n`;
    }
    brandTs += `        ],\n      },\n`;
  }
  brandTs += `    ],\n  },`;

  // If brand already exists in tsContent, replace it; otherwise insert before the closing `];`
  const brandRegex = new RegExp(`  {\\s*brand:\\s*['"]${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][\\s\\S]*?\\n  },`, 'g');
  if (brandRegex.test(tsContent)) {
    tsContent = tsContent.replace(brandRegex, brandTs);
    console.log(`✔ Replaced existing TS block for brand: ${brandName}`);
  } else {
    // Insert right before `\n];`
    const insertPos = tsContent.lastIndexOf("\n];");
    if (insertPos !== -1) {
      tsContent = tsContent.slice(0, insertPos) + "\n" + brandTs + tsContent.slice(insertPos);
      console.log(`✔ Appended new TS block for brand: ${brandName}`);
    } else {
      console.warn(`Could not find closing bracket in ${tsPath} for brand: ${brandName}`);
    }
  }
}

fs.writeFileSync(tsPath, tsContent, "utf8");
console.log(`✔ data/paint-codes-data.ts updated for all brands!`);
