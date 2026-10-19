"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Clock, MapPin, PackageCheck, ShieldCheck, Star, Users, Wrench } from "lucide-react";
import { siteConfig } from "@/config/site";

const BADGES = [
  { icon: ShieldCheck, label: "Colour Matching", color: "#E53935" },
  { icon: Star, label: "Automotive Refinish", color: "#F9A825" },
  { icon: PackageCheck, label: "Supplier Ranges", color: "#1565C0" },
  { icon: Wrench, label: "Workshop Supplies", color: "#2E7D32" },
  { icon: Users, label: "Walk-In Service", color: "#7B1FA2" },
  { icon: MapPin, label: "Local Stock Support", color: "#E65100" },
];

const STATS = [
  { value: "2022", label: "Established", bg: "#E53935", text: "white" },
  { value: "7+", label: "Product Systems", bg: "#1565C0", text: "white" },
  { value: "2K", label: "Paint Systems", bg: "#F9A825", text: "#111" },
  { value: "100%", label: "Customer Support Focus", bg: "#2E7D32", text: "white" },
];

export default function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative overflow-hidden bg-white py-14 sm:py-20 md:py-28">
      <div className="container relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="mb-9 sm:mb-14"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1.5 w-10 rounded-full bg-red-600" />
            <span className="text-sm font-bold uppercase tracking-widest text-red-600">
              Why Choose Us
            </span>
          </div>

          <h2
            className="text-gray-900"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Trusted for Paint,
            <br />
            <span style={{ color: "#E53935" }}>Prep & Finish</span>
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Serving vehicle owners, spray painters, panel beaters, workshops, contractors,
            and local businesses around Mankweng and Limpopo.
          </p>
        </motion.div>

        <div className="mb-10 grid grid-cols-2 gap-3 sm:mb-14 sm:gap-4 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl p-4 text-center sm:p-6"
              style={{ background: stat.bg }}
            >
              <div
                className="pointer-events-none absolute -bottom-4 -right-2 select-none font-black leading-none"
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontSize: "6rem",
                  color: stat.text === "white" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                }}
              >
                {stat.value}
              </div>

              <div
                className="relative z-10 mb-2 text-4xl font-black leading-none sm:text-5xl lg:text-6xl"
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  color: stat.text,
                }}
              >
                {stat.value}
              </div>

              <div
                className="relative z-10 text-sm font-semibold"
                style={{
                  color:
                    stat.text === "white" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)",
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-10 grid grid-cols-1 gap-2 sm:mb-14 sm:flex sm:flex-wrap sm:gap-3">
          {BADGES.map((badge, i) => {
            const Icon = badge.icon;

            return (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="flex items-center gap-2.5 rounded-2xl border-2 bg-white px-4 py-3 sm:rounded-full sm:px-5"
                style={{ borderColor: badge.color + "30" }}
              >
                <Icon size={16} style={{ color: badge.color }} />
                <span className="text-sm font-semibold text-gray-700">{badge.label}</span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-10 md:p-14"
          style={{ background: "#E53935" }}
        >
          <div
            className="pointer-events-none absolute -bottom-8 -right-8 select-none font-black leading-none"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontSize: "20rem",
              color: "rgba(255,255,255,0.06)",
            }}
          >
            TC
          </div>

          <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
                TRUECOLOURS Promise
              </div>

              <p
              className="max-w-2xl text-[1.65rem] font-bold leading-snug text-white sm:text-2xl md:text-3xl"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                “Bring your colour, code, panel, product request, or job problem — we’ll help you
                find the right paint system, prep material, coating, or workshop supply.”
              </p>
            </div>

            <div className="flex w-full flex-shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-center">
              <img
                src={siteConfig.images.logo}
                alt="TC logo"
                loading="lazy"
                decoding="async"
                className="h-16 w-48 object-contain object-center"
              />

              <div
                className="sr-only text-sm font-black tracking-widest text-white"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                TRUECOLOURS
              </div>

              <div className="flex items-center gap-1 text-xs text-white/60">
                <Clock size={12} />
                Ask for current stock and pricing
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
