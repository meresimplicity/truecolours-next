"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brush,
  Car,
  Droplets,
  Factory,
  FlaskConical,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

const PRODUCT_SYSTEMS = [
  {
    icon: Car,
    title: "Automotive Refinish Systems",
    category: "Paint Systems",
    desc: "Basecoat systems, metallic toners, solid pearls, 2K twinpacks, primers, hardeners, high-solid clearcoats, and finishing accessories.",
  },
  {
    icon: PackageCheck,
    title: "Commercial Vehicle Refinish",
    category: "Commercial Vehicle Refinish",
    desc: "2K twinpack systems, toners, hardeners, high-build primers, and heavy-duty protective coatings for trucks, trailers, and machinery.",
  },
  {
    icon: ShieldCheck,
    title: "Fillers, Putties & Repair",
    category: "Fillers & Body Repair",
    desc: "Body fillers, micro-fine stoppers, ultra-light fillers, fusion fillers, fibreglass resins, spray fillers, and spot putties.",
  },
  {
    icon: Factory,
    title: "Protective & Industrial Coatings",
    category: "Industrial",
    desc: "Quick-drying enamels, direct-to-metal (DTM) coatings, self-etch primers, road marking paints, and industrial steel finishes.",
  },
  {
    icon: Brush,
    title: "Wood Finish & Lacquers",
    category: null,
    desc: "Clear lacquers, pigmented lacquers, sanding sealers, timber stains, catalysts, additives, gloss toners, and tinted colours.",
  },
  {
    icon: Droplets,
    title: "Solvents & Thinners",
    category: "Solvents",
    desc: "300D thinners, lacquer thinners, 2K thinners, enamel thinners, basecoat thinners, acetone, benzine, and surface degreasers.",
  },
  {
    icon: FlaskConical,
    title: "Refinish Equipment & Supplies",
    category: "Tools & Supplies",
    desc: "Abrasives, sandpaper discs, masking tape, masking film, spray guns, polishing compounds, pads, and workshop supplies.",
  },
];

const PRODUCTS = [
  "Basecoat Systems",
  "2K Twinpack",
  "Clearcoats",
  "Primers",
  "Hardeners",
  "Thinners",
  "Solvents",
  "Body Fillers",
  "Spot Putty",
  "Spray Filler",
  "Fibreglass Resin",
  "Protective Coatings",
  "QD Enamel",
  "DTM Coatings",
  "Road Marking Paint",
  "Wood Lacquers",
  "Abrasives",
  "Sandpaper",
  "Masking Tape",
  "Masking Film",
  "Paint Strainers",
  "Paint Guns",
  "Polishes",
  "Compounds",
  "Dust Masks",
  "Tack Rags",
  "Colour Tools",
  "Workshop Accessories",
];

export default function ProductsSection() {
  return (
    <section
      id="products"
      className="relative isolate overflow-hidden border-y border-neutral-900 bg-neutral-950 py-16 text-white sm:py-20 lg:py-28"
    >
      <div className="container relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        {/* =========================================================================
            HEADER & INTRO
           ========================================================================= */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Product Range
          </div>

          <h2
            className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            PRODUCT SYSTEMS <br />
            <span className="text-neutral-400">WE SUPPLY & STOCK</span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-neutral-400 sm:text-lg">
            We stock and source products for the complete refinishing workflow — from colour
            and coating systems to surface prep, masking, sanding, polishing, and workshop consumables.
          </p>

          <p
            className="mt-3 text-lg font-black text-neutral-200 sm:text-xl"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Paint. Prep. Protect. Finish. All through TRUECOLOURS.
          </p>
        </div>

        {/* =========================================================================
            PRODUCT SYSTEMS GRID (Clean, Simple, Readable Cards)
           ========================================================================= */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_SYSTEMS.map((system, index) => {
            const Icon = system.icon;
            return (
              <motion.div
                key={system.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-6 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/80 sm:p-7"
              >
                {/* Number indicator */}
                <div
                  className="pointer-events-none absolute right-4 top-4 text-xs font-bold text-neutral-600 group-hover:text-neutral-400"
                >
                  0{index + 1}
                </div>

                {/* Icon */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-white transition-colors group-hover:border-neutral-600">
                  <Icon size={20} />
                </div>

                {/* Title */}
                <h3
                  className="mt-5 text-xl font-black text-white sm:text-2xl"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {system.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {system.desc}
                </p>
                {system.category ? (
                  <Link href={`/catalogue?category=${encodeURIComponent(system.category)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-bold text-white">Explore range <ArrowRight size={14} /></Link>
                ) : (
                  <a href={buildColourContactLink(`Hi TRUECOLOURS, please help me find products for ${system.title}.`)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-bold text-white">Ask about this range <ArrowRight size={14} /></a>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* =========================================================================
            QUICK PRODUCT LINES (Clean B&W Tags)
           ========================================================================= */}
        <div className="mt-14 rounded-3xl border border-neutral-800/80 bg-neutral-900/30 p-6 sm:mt-18 sm:p-8 lg:p-10">
          <div className="text-center">
            <h3
              className="text-2xl font-black uppercase text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              All Available Product Lines
            </h3>
            <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
              Available in trade quantities, custom formulas, and retail sizes.
            </p>
          </div>

          {/* Chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {PRODUCTS.map((product) => (
              <Link
                href={`/catalogue?search=${encodeURIComponent(product)}`}
                key={product}
                className="rounded-full border border-neutral-800 bg-neutral-900/90 px-3.5 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white sm:text-sm"
              >
                {product}
              </Link>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <a
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-neutral-950 shadow-md transition-all hover:bg-neutral-200 active:scale-95"
            >
              View Full Catalogue
              <ArrowRight size={16} />
            </a>

            <a
              href={buildColourContactLink("Hi TRUECOLOURS, I need a current price or stock check for a product")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:border-neutral-500 hover:bg-neutral-800 active:scale-95"
            >
              <MessageCircle size={16} />
              Ask About Current Stock
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
