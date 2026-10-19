import fs from "node:fs";
import path from "node:path";

// Ensure data/raw directory exists
const rawDir = path.join(process.cwd(), "data", "raw");
if (!fs.existsSync(rawDir)) {
  fs.mkdirSync(rawDir, { recursive: true });
}

// 1. Vehicles Hierarchy
const vehicleCatalogue = {
  brands: [
    {
      name: "Audi",
      models: [
        {
          name: "A1 Sportback",
          generations: [
            { name: "8X (1st Generation)", code: "8X", yearFrom: 2010, yearTo: 2018 },
            { name: "GB (2nd Generation)", code: "GB", yearFrom: 2018, yearTo: 2026 },
          ],
          years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "A3",
          generations: [
            { name: "8V", code: "8V", yearFrom: 2012, yearTo: 2020 },
            { name: "8Y", code: "8Y", yearFrom: 2020, yearTo: 2026 },
          ],
          years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "A4",
          generations: [
            { name: "B8", code: "B8", yearFrom: 2008, yearTo: 2015 },
            { name: "B9", code: "B9", yearFrom: 2016, yearTo: 2024 },
          ],
          years: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
        },
        {
          name: "Q5",
          generations: [
            { name: "8R", code: "8R", yearFrom: 2008, yearTo: 2017 },
            { name: "FY", code: "FY", yearFrom: 2017, yearTo: 2025 },
          ],
          years: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
        },
      ],
    },
    {
      name: "Volkswagen",
      models: [
        {
          name: "Polo",
          generations: [
            { name: "Polo 5 (6R/6C)", code: "6R", yearFrom: 2009, yearTo: 2017 },
            { name: "Polo 6 (AW)", code: "AW", yearFrom: 2017, yearTo: 2026 },
          ],
          years: [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Polo Vivo",
          years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Golf",
          generations: [
            { name: "Golf 7", code: "Mk7", yearFrom: 2012, yearTo: 2020 },
            { name: "Golf 8", code: "Mk8", yearFrom: 2020, yearTo: 2026 },
          ],
          years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Amarok",
          years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Tiguan",
          years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Toyota",
      models: [
        {
          name: "Hilux",
          generations: [
            { name: "Gen 7", code: "AN10", yearFrom: 2005, yearTo: 2015 },
            { name: "Gen 8", code: "AN120", yearFrom: 2015, yearTo: 2026 },
          ],
          years: [2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Fortuner",
          years: [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Corolla",
          years: [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Quantum",
          years: [2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "BMW",
      models: [
        {
          name: "3 Series",
          generations: [
            { name: "E90", code: "E90", yearFrom: 2005, yearTo: 2012 },
            { name: "F30", code: "F30", yearFrom: 2011, yearTo: 2019 },
            { name: "G20", code: "G20", yearFrom: 2019, yearTo: 2026 },
          ],
          years: [2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "1 Series",
          generations: [
            { name: "F20", code: "F20", yearFrom: 2011, yearTo: 2019 },
            { name: "F40", code: "F40", yearFrom: 2019, yearTo: 2026 },
          ],
          years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Mercedes-Benz",
      models: [
        {
          name: "C-Class",
          generations: [
            { name: "W204", code: "W204", yearFrom: 2007, yearTo: 2014 },
            { name: "W205", code: "W205", yearFrom: 2014, yearTo: 2021 },
            { name: "W206", code: "W206", yearFrom: 2021, yearTo: 2026 },
          ],
          years: [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "A-Class",
          generations: [
            { name: "W176", code: "W176", yearFrom: 2012, yearTo: 2018 },
            { name: "W177", code: "W177", yearFrom: 2018, yearTo: 2026 },
          ],
          years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Ford",
      models: [
        {
          name: "Ranger",
          generations: [
            { name: "T6", code: "T6", yearFrom: 2011, yearTo: 2022 },
            { name: "Next-Gen", code: "P703", yearFrom: 2022, yearTo: 2026 },
          ],
          years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "EcoSport",
          years: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
        },
      ],
    },
    {
      name: "Hyundai",
      models: [
        {
          name: "i20",
          years: [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Tucson",
          years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Isuzu",
      models: [
        {
          name: "D-Max",
          years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Nissan",
      models: [
        {
          name: "NP200",
          years: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
        },
        {
          name: "Navara",
          years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Suzuki",
      models: [
        {
          name: "Swift",
          years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
        {
          name: "Jimny",
          years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Renault",
      models: [
        {
          name: "Kwid",
          years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Mazda",
      models: [
        {
          name: "CX-5",
          years: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Kia",
      models: [
        {
          name: "Picanto",
          years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Mahindra",
      models: [
        {
          name: "Pik Up",
          years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "GWM / Haval",
      models: [
        {
          name: "Jolion",
          years: [2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
    {
      name: "Chery",
      models: [
        {
          name: "Tiggo 4 Pro",
          years: [2021, 2022, 2023, 2024, 2025, 2026],
        },
      ],
    },
  ],
};

fs.writeFileSync(
  path.join(rawDir, "vehicles-catalogue.json"),
  JSON.stringify(vehicleCatalogue, null, 2)
);

console.log("-> Written data/raw/vehicles-catalogue.json");
