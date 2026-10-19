"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Headphones,
  Layers,
  MessageCircle,
  PackageCheck,
  Palette,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

const suppliers = [
  { name: "Luxor Paints", logo: "/images/suppliers/luxor.png", website: "https://luxorpaints.co.za/", accent: "#4f46e5" },
  { name: "Paintchem", logo: "/images/suppliers/paintchem.png", website: "https://www.paintchem.co.za/", accent: "#ef4444" },
  { name: "Cresta Paints", logo: "/images/suppliers/cresta.png", website: "https://crestapaints.com/", accent: "#f97316" },
  { name: "Bulldog Abrasives", logo: "/images/suppliers/bulldog.png", website: "https://bulldogabrasives.co.za/", accent: "#dc2626" },
  { name: "GlueDevil", logo: "/images/suppliers/gluedevil.png", website: "https://gluedevil.co.za/", accent: "#111827" },
  { name: "KAPCI Coatings", logo: "/images/suppliers/kapci.png", website: "https://kapci.com/", accent: "#f59e0b" },
  { name: "Klingspor", logo: "/images/suppliers/klingspor.png", website: "https://www.klingspor.co.za/", accent: "#facc15" },
  { name: "Farécla", logo: "/images/suppliers/farecla.jpg", website: "https://www.farecla.com/", accent: "#fde047" },
  { name: "Q-Bond", logo: "/images/suppliers/qbond.svg", website: "https://qbond.com/", accent: "#facc15" },
  { name: "Pratley", logo: "/images/suppliers/pratley.png", website: "https://www.pratley.com/", accent: "#ef4444" },
  { name: "Vermont Sales", logo: "/images/suppliers/vermont-sales.png", website: "https://www.vermontsales.co.za/", accent: "#111827" },
  { name: "Eurocel / Sicad Group", logo: "/images/suppliers/eurocel.png", website: "https://sicad.co.za/", accent: "#dc2626" },
  { name: "Gondolier", logo: "/images/suppliers/gondolier.png", website: "https://www.gondolier.co.za/", accent: "#94a3b8" },
  { name: "Duram Smart Paint", logo: "/images/suppliers/duram.svg", website: "https://www.duram.co.za/", accent: "#22c55e" },
  { name: "Carvello", logo: "/images/suppliers/carvello.png", website: "https://www.carvello.net/", accent: "#dc2626" },
] as const;

const corePillars = [
  {
    icon: Palette,
    title: "Precision Colour Matching",
    desc: "Exact custom matching using paint codes, fuel caps, sample panels, and digital colour formulations for an undetectable blend.",
    badge: "Colour Match Support",
    href: "/find-my-colour",
  },
  {
    icon: Layers,
    title: "Automotive Refinishing Systems",
    desc: "Complete 2K twinpacks, basecoats, metallic toners, solid pearls, high-solid clearcoats, fast hardeners, and thinners.",
    badge: "Trade Grade",
    href: "/catalogue?category=Paint+Systems",
  },
  {
    icon: Wrench,
    title: "Preparation & Body Repair",
    desc: "High-grade body fillers, micro-fine stoppers, fibreglass resins, spot putties, waterproof sandpaper, and abrasives.",
    badge: "Flawless Prep",
    href: "/catalogue?category=Fillers+%26+Body+Repair",
  },
  {
    icon: ShieldCheck,
    title: "Industrial & Protective Coatings",
    desc: "Direct-to-metal (DTM) coatings, quick-drying enamels, self-etch primers, commercial fleet coatings, and road marking paints.",
    badge: "Heavy Duty",
    href: "/catalogue?category=Industrial",
  },
];

const capabilities = [
  "OEM-accurate colour formulation",
  "Basecoat & 2K twinpack systems",
  "Commercial vehicle coatings",
  "Body fillers & pinhole stoppers",
  "Abrasives, sanding & polishing",
  "Workshop consumables & masking",
];

export default function WhatWeDoSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-28">
      {/* Top Background Pattern */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-50 to-transparent" />

      {/* =========================================================================
          SECTION 1: EXPANDED "WHAT WE DO" (Full-Width Showcase)
         ========================================================================= */}
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Heading, Story & Key Capabilities */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="h-1.5 w-12 rounded-full bg-gradient-to-r from-red-600 to-blue-700" />
              <span className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
                Paint. Prep. Protect. Finish.
              </span>
            </div>

            <h2
              className="text-5xl font-black leading-none tracking-tight text-[#0755a5] sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              WHAT WE DO
            </h2>

            <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
              At <strong className="text-slate-900">TRUECOLOURS</strong>, we empower panel beaters, spray
              painters, fleet operators, contractors, and DIY vehicle restorers with dependable, trade-grade
              coatings and expert guidance.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
              From exact spectrometer colour matching to full refinishing workflow supplies — primers, body
              fillers, abrasives, adhesives, thinners, and finishing accessories — we make sourcing paint products
              fast, simple, and reliable.
            </p>

            {/* Checklist of Core Capabilities */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {capabilities.map((capability, index) => (
                <motion.div
                  key={capability}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.4 }}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2 text-xs font-bold text-slate-800 sm:text-sm"
                >
                  <CheckCircle2 size={16} className="shrink-0 text-blue-700" />
                  <span>{capability}</span>
                </motion.div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <a
                href="/catalogue"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0755a5] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/15 transition-all hover:bg-blue-800 active:scale-95"
              >
                Browse Full Catalogue
                <ArrowRight size={16} />
              </a>

              <a
                href={buildColourContactLink("Hi TRUECOLOURS, I would like to inquire about your paint and refinishing products")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <MessageCircle size={16} className="text-emerald-600" />
                Contact Paint Desk
              </a>
            </div>
          </motion.div>

          {/* Right Column: 4 Expanded Feature Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="grid gap-4 sm:grid-cols-2 lg:col-span-6"
          >
            {corePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/5 sm:p-6"
                >
                  <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-50/50 transition-transform duration-500 group-hover:scale-150" />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0755a5] ring-1 ring-blue-100/70 transition-colors group-hover:bg-[#0755a5] group-hover:text-white">
                        <Icon size={22} />
                      </div>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                        {pillar.badge}
                      </span>
                    </div>

                    <h3
                      className="mt-4 text-xl font-black leading-snug text-slate-950 sm:text-2xl"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      {pillar.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {pillar.desc}
                    </p>
                  </div>

                  <a href={pillar.href} aria-label={`Learn more about ${pillar.title}`} className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-md text-xs font-bold text-blue-700 transition-transform duration-200 group-hover:translate-x-1">
                    <span>Learn more</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* =========================================================================
            SECTION 2: OUR COMMITMENTS (Dedicated Separated Full-Width Grid)
           ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ duration: 0.7 }}
          className="mt-20 rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-6 shadow-sm sm:mt-24 sm:p-8 lg:p-10"
        >
          <div className="mb-8 flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                Service & Standards
              </p>
              <h3
                className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                OUR COMMITMENTS TO YOU
              </h3>
            </div>
            <p className="max-w-md text-xs text-slate-500 sm:text-sm">
              We stand behind every order with dedicated customer support, secure transactions, and dependable trade logistics.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Commitment
              icon={Truck}
              title="Local Delivery & Collection"
              text="Ask our team about delivery options or collect your order directly from our Mankweng store."
            />
            <Commitment
              icon={ShieldCheck}
              title="Secure Payment Options"
              text="Pay conveniently by EFT, bank transfer, Visa, Mastercard or PayPal where available."
              paymentMarks
            />
            <Commitment
              icon={Headphones}
              title="Helpful Customer Service"
              text="Our team is on hand with product guidance, colour matching and stock support."
            />
            <Commitment
              icon={PackageCheck}
              title="Real-Time Order Updates"
              text="We keep you informed from initial product enquiry through to collection or delivery."
            />
          </div>
        </motion.div>
      </div>

      {/* =========================================================================
          SECTION 3: TRUSTED SUPPLIER RANGES
         ========================================================================= */}
      <div className="mx-auto mt-20 max-w-[1500px] px-4 sm:px-6 lg:mt-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
              Available through TRUECOLOURS
            </p>
            <h3
              className="mt-2 text-4xl font-black leading-none text-slate-950 sm:text-5xl"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Trusted supplier ranges
            </h3>
          </div>
          <a
            href="/catalogue"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-red-600"
          >
            Browse catalogue <ArrowUpRight size={16} />
          </a>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {suppliers.map((supplier, index) => (
            <motion.a
              key={supplier.name}
              href={supplier.website}
              target="_blank"
              rel="noreferrer"
              aria-label={`Visit ${supplier.name} website`}
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: (index % 5) * 0.07, duration: 0.45 }}
              whileHover={{ y: -7, scale: 1.025 }}
              className="group relative flex min-h-36 overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-shadow hover:shadow-xl hover:shadow-blue-950/10 sm:min-h-44 sm:p-5"
            >
              <span
                className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                style={{ backgroundColor: supplier.accent }}
              />
              <span
                className="absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-[1.8]"
                style={{ backgroundColor: supplier.accent }}
              />
              <div className="relative m-auto flex w-full flex-col items-center text-center">
                <div className="relative flex h-16 w-full items-center justify-center sm:h-20">
                  <Image
                    src={supplier.logo}
                    alt={`${supplier.name} logo`}
                    width={360}
                    height={160}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 27vw, 15vw"
                  />
                </div>
                <div className="mt-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors group-hover:text-slate-700 sm:text-[10px]">
                  {supplier.name}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-700 via-violet-600 via-50% to-red-500" />
    </section>
  );
}

function Commitment({
  icon: Icon,
  title,
  text,
  paymentMarks = false,
}: {
  icon: typeof Truck;
  title: string;
  text: string;
  paymentMarks?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all duration-200 hover:border-blue-200 hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#0755a5] ring-1 ring-blue-100">
        <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h4
        className="mt-4 text-lg font-black uppercase leading-tight text-slate-950 sm:text-xl"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}
      >
        {title}
      </h4>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{text}</p>

      {paymentMarks && (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Supported payment methods">
          <img src="/images/payments/visa.svg" alt="Visa" className="h-5 w-auto" />
          <img src="/images/payments/mastercard.svg" alt="Mastercard" className="h-6 w-auto" />
          <img src="/images/payments/paypal.svg" alt="PayPal" className="h-5 w-auto" />
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-700">
            EFT
          </span>
        </div>
      )}
    </div>
  );
}

