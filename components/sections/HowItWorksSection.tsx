"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Car, Package, Palette, Search, Sparkles, Wrench } from "lucide-react";

const ease = [0.23, 1, 0.32, 1] as const;

type ProcessStep = {
  number: string;
  title: string;
  text: string;
  image: string;
  imageAlt: string;
  accent: string;
  Icon: LucideIcon;
};

const PROCESS_STEPS: ProcessStep[] = [
  {
    number: "01",
    title: "Bring the Vehicle Problem",
    text: "A customer comes in with a dent, scratch, colour mismatch, or repair need.",
    image: "/Story/337A7D8C-2A2F-4430-A8E8-4A0B87C796A6.PNG",
    imageAlt: "TRUECOLOURS customer bringing a vehicle in for paint and repair help",
    accent: "#E53935",
    Icon: Car,
  },
  {
    number: "02",
    title: "We Check the Job",
    text: "The car, panel, fuel cap, paint code, or sample is checked so the right solution can be found.",
    image: "/Story/FA64F8F0-2109-409B-908B-2AAB85BF4024.PNG",
    imageAlt: "TRUECOLOURS technician inspecting a vehicle dent with the customer",
    accent: "#1565C0",
    Icon: Search,
  },
  {
    number: "03",
    title: "Colour Matching",
    text: "We help match the correct paint colour, shade, toner, basecoat, or paint system.",
    image: "/Story/D5ECB346-12E3-47E1-8A24-09BA43CE7A75.PNG",
    imageAlt: "TRUECOLOURS technician matching vehicle paint colour in a paint lab",
    accent: "#F9A825",
    Icon: Palette,
  },
  {
    number: "04",
    title: "Right Products Selected",
    text: "We guide the customer to the correct filler, primer, hardener, thinner, masking, abrasive, or paint product.",
    image: "/Story/48F9FE13-EC0C-4E7A-AABB-DBB5431C4547.PNG",
    imageAlt: "TRUECOLOURS repair products and surface preparation being selected for a vehicle job",
    accent: "#2E7D32",
    Icon: Package,
  },
  {
    number: "05",
    title: "Repair & Finish Support",
    text: "The selected products support the repair, prep, spraying, polishing, and final finish.",
    image: "/Story/3A5E2C77-2528-48BF-A571-C4CED3D10C3A.PNG",
    imageAlt: "TRUECOLOURS technician spray painting a vehicle during the repair process",
    accent: "#E53935",
    Icon: Wrench,
  },
  {
    number: "06",
    title: "Clean Final Result",
    text: "The goal is a smooth, professional finish with the right colour and supplies for the job.",
    image: "/Story/337A7D8C-2A2F-4430-A8E8-4A0B87C796A6.PNG",
    imageAlt: "TRUECOLOURS customer receiving a clean professional vehicle result",
    accent: "#1565C0",
    Icon: Sparkles,
  },
];

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = PROCESS_STEPS[activeStep];
  const progress = `${((activeStep + 1) / PROCESS_STEPS.length) * 100}%`;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | undefined;
    const visibleSteps = new Map<Element, IntersectionObserverEntry>();
    const observeSteps = () => {
      observer?.disconnect();
      visibleSteps.clear();
      if (!media.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleSteps.set(entry.target, entry);
          else visibleSteps.delete(entry.target);
        }
        const visibleEntry = Array.from(visibleSteps.values())
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visibleEntry) setActiveStep(Number(visibleEntry.target.getAttribute("data-step-index")));
      }, { rootMargin: "-25% 0px -40% 0px", threshold: [0.2, 0.5] });
      stepRefs.current.forEach((step) => step && observer?.observe(step));
    };
    observeSteps();
    media.addEventListener("change", observeSteps);
    return () => { observer?.disconnect(); media.removeEventListener("change", observeSteps); };
  }, []);

  return (
    <section
      id="how-it-works"
      className="relative overflow-clip bg-[#f8fafc] py-14 text-gray-950 sm:py-20 md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{
          background: "linear-gradient(90deg, #E53935 0%, #1565C0 34%, #F9A825 67%, #2E7D32 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(90deg,#111_1px,transparent_1px),linear-gradient(#111_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="container relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          className="mx-auto mb-9 max-w-3xl text-center sm:mb-12 md:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-[#E53935]" />
            <span className="h-1.5 w-8 rounded-full bg-[#1565C0]" />
            <span className="h-1.5 w-8 rounded-full bg-[#F9A825]" />
            <span className="h-1.5 w-8 rounded-full bg-[#2E7D32]" />
          </div>

          <h2
            className="text-gray-950"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontWeight: 900,
              fontSize: "clamp(2.45rem, 6vw, 4.6rem)",
              lineHeight: 0.95,
              letterSpacing: "0",
            }}
          >
            How TRUECOLOURS Helps You
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
            From dents and scratches to colour matching and finishing supplies, we help you find the
            right products for the job.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-start">
          <motion.div
            id="process-preview" className="order-1 hidden lg:order-2 lg:sticky lg:top-28 lg:block"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.65, ease }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/12 ring-1 ring-slate-900/10 sm:rounded-[2rem]">
              <div className="absolute inset-x-0 top-0 z-20 flex h-1.5">
                {["#E53935", "#1565C0", "#F9A825", "#2E7D32"].map((colour) => (
                  <span key={colour} className="h-full flex-1" style={{ backgroundColor: colour }} />
                ))}
              </div>

              <div className="relative aspect-[4/3] bg-slate-100">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={active.number}
                    src={active.image}
                    alt={active.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.035 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.55, ease }}
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

                <motion.div
                  key={`${active.number}-caption`}
                  className="absolute bottom-0 left-0 right-0 p-4 text-white sm:p-5 md:p-7"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <span
                    className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                    style={{ backgroundColor: active.accent }}
                  >
                    Step {active.number}
                  </span>
                  <h3
                    className="text-3xl font-black leading-none md:text-4xl"
                    style={{ fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0" }}
                  >
                    {active.title}
                  </h3>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute bottom-6 left-[1.35rem] top-6 hidden w-px bg-slate-200 md:block">
                <motion.div
                  className="absolute left-0 top-0 w-px rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, #E53935 0%, #1565C0 34%, #F9A825 67%, #2E7D32 100%)",
                  }}
                  animate={{ height: progress }}
                  transition={{ duration: 0.55, ease }}
                />
              </div>

              <div className="space-y-4 md:space-y-5 md:pl-12">
                {PROCESS_STEPS.map((step, index) => {
                  const isActive = index === activeStep;
                  const Icon = step.Icon;

                  return (
                    <motion.button
                      key={step.title}
                      ref={(node) => {
                        stepRefs.current[index] = node;
                      }}
                      type="button"
                      data-step-index={index}
                      onClick={() => setActiveStep(index)}
                      aria-pressed={isActive}
                      aria-label={`Step ${step.number}: ${step.title}`}
                      className="group relative w-full rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-lg hover:shadow-slate-900/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1565C0] sm:p-4 md:p-5"
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      animate={{
                        boxShadow: isActive
                          ? "0 24px 50px rgba(15, 23, 42, 0.14)"
                          : "0 1px 2px rgba(15, 23, 42, 0.06)",
                      }}
                      transition={{ duration: 0.42, ease, delay: index * 0.035 }}
                    >
                      <motion.span
                        className="absolute -left-[3.15rem] top-5 hidden h-11 w-11 items-center justify-center rounded-full border-4 border-[#f8fafc] text-xs font-black text-white shadow-lg md:flex"
                        animate={{
                          scale: isActive ? 1.08 : 1,
                          backgroundColor: step.accent,
                        }}
                        transition={{ duration: 0.35, ease }}
                      >
                        {step.number}
                      </motion.span>

                      <span
                        className="absolute inset-y-4 left-0 w-1 rounded-r-full"
                        style={{ backgroundColor: step.accent }}
                      />

                      <div className="flex gap-3 pl-2 sm:gap-4 sm:pl-3">
                        <motion.span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                          animate={{
                            backgroundColor: step.accent,
                            scale: isActive ? 1.04 : 1,
                          }}
                          transition={{ duration: 0.35, ease }}
                        >
                          <Icon size={20} />
                        </motion.span>

                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                              Step {step.number}
                            </span>
                            {isActive && (
                              <motion.span
                                className="h-1.5 w-10 rounded-full"
                                style={{ backgroundColor: step.accent }}
                                layoutId="active-step-accent"
                              />
                            )}
                          </div>

                          <h3
                            className="text-2xl font-black leading-none text-slate-950 md:text-3xl"
                            style={{
                              fontFamily: "var(--font-barlow-condensed)",
                              letterSpacing: "0",
                            }}
                          >
                            {step.title}
                          </h3>

                          <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-[15px]">
                            {step.text}
                          </p>
                        </div>
                      </div>
                      {isActive && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 overflow-hidden rounded-xl lg:hidden">
                        <img src={step.image} alt={step.imageAlt} loading="lazy" width={800} height={600} className="aspect-[4/3] w-full object-cover" />
                      </motion.div>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
