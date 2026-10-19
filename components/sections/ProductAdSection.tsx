"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { ProductImage } from "@/components/catalogue/ProductImage";
import { catalogueProducts } from "@/data/catalogue";
import { getCatalogueProductImage } from "@/data/catalogueImageResolver";

const FEATURED_PRODUCTS = catalogueProducts.filter((product) => product.featured).slice(0, 12);

export default function ProductAdSection() {
  return (
    <section id="featured-products" className="bg-white py-14 sm:py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:mb-10 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="h-1.5 w-10 rounded-full bg-red-600" />
              <span className="text-sm font-bold uppercase tracking-widest text-red-600">
                Our Products
              </span>
            </div>

            <h2
              className="max-w-3xl text-[2.35rem] font-black leading-[0.95] text-gray-950 sm:text-4xl md:text-6xl"
              style={{ fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0" }}
            >
              Premium refinish products for professional results.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap"
          >
            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-gray-200 transition hover:bg-gray-800 active:scale-95"
            >
              View Catalogue
              <ArrowUpRight size={17} />
            </Link>

            <a
              href={buildColourContactLink("Hi TRUECOLOURS, I want to ask about your products.")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-green-100 transition hover:bg-green-700 active:scale-95"
            >
              <MessageCircle size={17} />
              Ask on WhatsApp
            </a>
          </motion.div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {FEATURED_PRODUCTS.map((product, index) => {
            const image = getCatalogueProductImage(product);

            return (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.06,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70"
              >
                <Link href={`/catalogue?product=${encodeURIComponent(product.id)}#product-${product.id}`} aria-label={`View ${product.name}`} className="block rounded-2xl">
                <div className="relative border-b border-gray-100 bg-white p-2.5 sm:p-3">
                  <ProductImage
                    src={image}
                    alt={`${product.name} available through TRUECOLOURS`}
                    className="w-full !aspect-[5/4] rounded-xl"
                    priority={false}
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, (max-width: 1280px) 23vw, 160px"
                    cloudinaryWidth={480}
                    imageMode="normal"
                  />
                </div>

                <div className="space-y-1.5 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {product.subcategory}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      {product.brand}
                    </span>
                  </div>

                  <h3
                    className="text-sm font-black leading-tight text-gray-950 sm:text-base"
                    style={{ fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0" }}
                  >
                    {product.name}
                  </h3>

                  {(product.size || product.colour) && (
                    <p className="text-xs leading-relaxed text-gray-500">
                      {[product.size, product.colour].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {product.marketResearch && (
                    <p className="text-xs font-bold leading-relaxed text-emerald-700">
                      Market reference: {product.marketResearch.priceRange}
                    </p>
                  )}
                  <span className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-blue-700">View product <ArrowUpRight size={13} /></span>
                </div>
                </Link>
              </motion.article>
            );
          })}
        </div>
        <div className="mt-8 text-center"><Link href="/catalogue" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">Browse all products <ArrowUpRight size={16} /></Link></div>
      </div>
    </section>
  );
}
