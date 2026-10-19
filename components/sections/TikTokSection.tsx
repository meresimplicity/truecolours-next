"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, MessageCircle, Play, Search } from "lucide-react";
import { siteConfig } from "@/config/site";

const WHATSAPP_TEXT =
  "Hi TRUECOLOURS, I saw a product on TikTok. I can send a screenshot, video, product name or code. Please help confirm current stock and pricing.";

export default function TikTokSection() {
  return (
    <section id="social-enquiries" className="relative overflow-hidden bg-gray-950 px-4 py-14 text-white sm:py-16 md:py-20">
      <img
        src={siteConfig.images.paintCans}
        alt="TRUECOLOURS product shelves and paint supplies"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/92 to-gray-950/54" />

      <div className="container relative z-10 mx-auto max-w-7xl lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                <Play size={18} fill="currentColor" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-red-300">
                Social Product Enquiries
              </span>
            </div>

            <h2
              className="max-w-3xl text-4xl font-black leading-none md:text-6xl"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Seen It on TikTok?
              <br />
              Ask Us for It.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              Saw a paint, primer, thinner, filler, coating, masking product, abrasive or tool on
              our TikTok? Send us the video, screenshot, product name or code on WhatsApp and we’ll
              help confirm current stock and pricing.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
              <a
                href={buildColourContactLink(WHATSAPP_TEXT)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 font-bold text-white shadow-lg transition hover:bg-green-700 active:scale-95"
              >
                <MessageCircle size={18} />
                WhatsApp a Screenshot
              </a>

              <Link
                href="/catalogue"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <Search size={18} />
                Open Catalogue
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
          >
            {[
              "Send the product picture or code",
              "Ask for current stock and pricing",
              "Available through TRUECOLOURS",
            ].map((line) => (
              <div
                key={line}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/8 p-4 backdrop-blur"
              >
                <Camera size={18} className="flex-shrink-0 text-yellow-300" />
                <span className="text-sm font-bold leading-snug text-white/82">{line}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
