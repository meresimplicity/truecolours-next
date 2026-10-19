"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { testimonials, type Testimonial } from "@/data/testimonials";

const ease = [0.23, 1, 0.32, 1] as const;

const avatarStyles = [
  "bg-red-50 text-red-700 ring-red-100",
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-yellow-50 text-yellow-700 ring-yellow-100",
  "bg-green-50 text-green-700 ring-green-100",
  "bg-purple-50 text-purple-700 ring-purple-100",
  "bg-gray-100 text-gray-800 ring-gray-200",
];

const cardOffsets = ["xl:mt-8", "xl:mt-0", "xl:mt-14", "xl:mt-0"];

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease },
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function GoogleStarIcon({ className = "w-[18px] h-[18px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FBBC04">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function GoogleLogoIcon({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function LocalGuideBadge() {
  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 ring-2 ring-white shadow-xs"
      title="Google Reviewer"
    >
      <svg className="h-2.5 w-2.5 fill-white text-white" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    </div>
  );
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const rating = testimonial.rating ?? 5;
  const isLong = testimonial.quote.length > 95;
  const displayText =
    !isExpanded && isLong
      ? `${testimonial.quote.slice(0, 95)}...`
      : testimonial.quote;

  return (
    <motion.article
      className={`mb-4 inline-block w-full break-inside-avoid rounded-3xl border border-gray-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_16px_48px_rgba(15,23,42,0.1)] sm:mb-5 sm:p-6 md:mb-6 md:p-6 ${
        cardOffsets[index % cardOffsets.length]
      }`}
      variants={cardVariants}
      whileHover={{ y: -5 }}
    >
      {/* Top Header: 5 Stars + Google Logo */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <GoogleStarIcon key={i} className="h-5 w-5 fill-[#FBBC04] text-[#FBBC04]" />
          ))}
        </div>
        <div className="flex shrink-0 items-center">
          <GoogleLogoIcon className="h-5 w-5" />
        </div>
      </div>

      {/* Review Text */}
      <div className="mt-4">
        <p className="text-[15px] font-normal leading-relaxed text-gray-800 sm:text-base">
          {displayText}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Show less" : "Read full review"} from ${testimonial.name}`}
            className="mt-2 text-sm font-medium text-gray-900 hover:text-black hover:underline"
          >
            {isExpanded ? "Less" : "More"}
          </button>
        )}
      </div>

      {/* Bottom Profile Row */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative shrink-0">
          {testimonial.avatar && !imgError ? (
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              onError={() => setImgError(true)}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-gray-200"
              loading="lazy"
            />
          ) : (
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ring-1 ${
                avatarStyles[index % avatarStyles.length]
              }`}
            >
              {getInitials(testimonial.name)}
            </div>
          )}
          <LocalGuideBadge />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold leading-snug text-gray-900 sm:text-base">
            {testimonial.name}
          </h3>
          <p className="text-xs font-normal text-gray-500 sm:text-sm">
            {testimonial.timeAgo || testimonial.role || "Verified Customer"}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="relative isolate overflow-hidden bg-white px-4 py-14 sm:py-16 md:py-24 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <motion.div
        className="relative z-10 mx-auto max-w-7xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.01 }}
      >
        <motion.div className="mx-auto max-w-3xl text-center" variants={headingVariants}>
          <h2
            className="text-4xl font-black leading-none text-gray-950 md:text-6xl"
            style={{ fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0" }}
          >
            What Our Customers Say
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 md:text-lg">
            Trusted by panel beaters, workshops, contractors, and automotive paint professionals.
          </p>
        </motion.div>

        <motion.div
          className="mt-9 columns-1 gap-5 sm:mt-12 md:columns-2 md:gap-6 xl:columns-3"
          variants={sectionVariants}
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

