"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { catalogueFilters } from "@/data/catalogue";
import { testimonials } from "@/data/testimonials";
import GallerySection from "./GallerySection";
import FAQSection from "./FAQSection";
import ContactSection from "./ContactSection";

const services = [
  ["Which colour belongs on my car?", "Find factory paint codes by vehicle, or explore original antique and classic colour charts.", "/find-my-colour"],
  ["Can you match the colour I have?", "Bring a fuel cap, painted panel or sample to the paint desk for a physical colour check.", "/#contact"],
  ["What does the surface need first?", "Choose fillers, primers, sanding and masking products for the preparation ahead.", "/catalogue?category=Prep+%26+Repair"],
  ["Which products work together?", "Get guidance on paint systems, clearcoats, hardeners and compatible thinners.", "/catalogue?category=Paint+Systems"],
  ["How can I protect an industrial surface?", "Explore coatings and finishes for durable protection and maintenance.", "/catalogue?category=Industrial"],
  ["What does my workshop need?", "Find abrasives, masking, tools and everyday supplies in one place.", "/catalogue?category=Tools+%26+Supplies"],
];
const productDescriptions: Record<string,string> = {
  "Paint Systems": "Automotive colour, clearcoats and hardeners for your refinish system.",
  "Prep & Repair": "Fillers, primers and preparation products to build the right foundation.",
  Industrial: "Coatings and protective finishes for hardworking surfaces.",
  Solvents: "Thinners and cleaning solvents for preparation and clean-up.",
  Masking: "Tape, film and foam tape for protection and clean paint edges.",
  Abrasives: "Sanding products and abrasives for preparation and finishing.",
  "Tools & Supplies": "Application accessories and everyday workshop supplies.",
};
const stages = [
  ["Bring the project", "Start with your vehicle, colour code, sample or the surface you need to coat."],
  ["Check the colour", "Use the finder as a starting point. The paint desk can check a physical sample and colour variants."],
  ["Choose the system", "Confirm the paint, preparation materials and supporting products for the job."],
  ["Prepare the surface", "Fill, sand, clean and mask with products suited to the surface and paint system."],
  ["Finish with confidence", "Confirm availability and current pricing, then arrange collection or discuss delivery."],
];

function PaintJourney() {
  const [active,setActive] = useState(0);
  const rows = useRef<Array<HTMLLIElement|null>>([]);
  const reduced = useReducedMotion();
  useEffect(() => {
    const visible = new Map<number,number>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const index = Number((entry.target as HTMLElement).dataset.stage);
        if (entry.isIntersecting) visible.set(index,entry.intersectionRatio); else visible.delete(index);
      }
      const current = [...visible].sort((a,b) => b[1]-a[1])[0];
      if (current) setActive(current[0]);
    },{rootMargin:"-25% 0px -30% 0px",threshold:[0,.2,.5,.8]});
    rows.current.forEach(row => { if(row) observer.observe(row); });
    return () => observer.disconnect();
  },[]);
  return <section id="how-it-works" className="tc-section tc-journey" aria-labelledby="journey-title"><div className="tc-journey-sticky"><p className="tc-eyebrow">How we begin</p><h2 id="journey-title">You have a project.<br/><span>Let’s find<br/>the right finish.</span></h2><p className="tc-section-description">A clear path from your first colour question to the products you need.</p><div className="tc-journey-orbit" aria-hidden="true"><motion.svg viewBox="0 0 300 300" animate={{rotate:active*72}} transition={{duration:reduced ? 0 : .8}}><circle cx="150" cy="150" r="139" fill="none" stroke="currentColor" strokeOpacity=".15"/><circle cx="150" cy="150" r="139" fill="none" stroke="currentColor" strokeDasharray="1 11" strokeWidth="2"/><circle cx="150" cy="11" r="5" fill="currentColor"/></motion.svg><div><span className="tc-index">0{active+1} / 05</span><strong>{["Project","Colour","System","Prepare","Finish"][active]}</strong></div></div></div><ol className="tc-journey-stages">{stages.map(([title,body],index) => <li key={title} ref={node => {rows.current[index]=node;}} data-stage={index} className={active===index ? "is-active" : ""}><span className="tc-index">0{index+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>;
}

export default function CompanyHome() {
  const [allReviews,setAllReviews] = useState(false);
  return <div className="tc-home">
    <section id="about" className="tc-section" aria-labelledby="about-title"><div className="tc-story"><img src={siteConfig.images.colourMatching} alt="Paint colour matching and sample selection" width={800} height={800} loading="lazy"/><div><p className="tc-eyebrow">The finish starts here</p><h2 id="about-title">The right colour.<br/><span>The right products.<br/>A clearer next step.</span></h2><p className="tc-section-description">From a single panel to a full refinish, the products work as a system. TRUECOLOURS supplies automotive and industrial paints, colour matching, preparation materials and workshop essentials in Mankweng, Limpopo.</p><Link href="/#contact" className="tc-text-link">Bring your project to the paint desk<ArrowRight size={18}/></Link></div></div><div className="tc-outcomes">{[["Match","Find the colour your project needs."],["Prepare","Build a sound foundation for the finish."],["Protect","Choose a coating for the surface and job."],["Finish","Bring the full paint system together."]].map(([title,body]) => <div key={title}><h3>{title}.</h3><p>{body}</p></div>)}</div></section>
    <section id="services" className="tc-section" aria-labelledby="services-title"><header className="tc-split-intro"><div><p className="tc-eyebrow">Questions from your next project</p><h2 id="services-title">The questions behind<br/><span>your next finish.</span></h2></div><p>A colour to match. A panel to repair. A surface to protect. Start with the job, and we’ll help you find the products that fit.</p></header><div className="tc-service-list">{services.map(([title,body,href],index) => <Link key={title} href={href} className="tc-service-row"><span className="tc-index">0{index+1}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowUpRight size={18}/></Link>)}</div><div className="tc-section-foot"><p>Colour matching and product guidance for vehicle owners, panel beaters, spray painters, contractors and workshops.</p><Link href="/catalogue" className="tc-text-link">Explore the catalogue<ArrowRight size={18}/></Link></div></section>
    <section className="tc-section" aria-labelledby="starting-title"><p className="tc-eyebrow">Two starting points. One better finish.</p><h2 id="starting-title">Start with the colour.<br/><span>Or start with the job.</span></h2><div className="tc-starting-points"><article><img src={siteConfig.images.sprayPaint} alt="Automotive paint application and refinishing" width={800} height={600} loading="lazy"/><p className="tc-eyebrow">Find My Colour</p><h3>Your vehicle has a colour.<br/>Let’s find where to start.</h3><p>Search by vehicle or paint code. For restorations, browse antique, vintage and classic manufacturer colour books and original charts.</p><Link href="/find-my-colour" className="tc-text-link">Find my colour<ArrowRight size={18}/></Link></article><article><img src={siteConfig.images.paintCans} alt="TRUECOLOURS paint and workshop product range" width={800} height={600} loading="lazy"/><p className="tc-eyebrow">The product catalogue</p><h3>A good finish needs more<br/>than the paint.</h3><p>Explore paint systems, primers, fillers, thinners, hardeners, abrasives and masking. Search by name, supplier or product code.</p><Link href="/catalogue" className="tc-text-link">Explore products<ArrowRight size={18}/></Link></article></div></section>
    <section id="products" className="tc-section" aria-labelledby="products-title"><header className="tc-split-intro"><div><p className="tc-eyebrow">Products for the way you work</p><h2 id="products-title">Paint. Prep.<br/><span>Protect. Finish.</span></h2></div><p>The colour is one part of the job. Find the materials and accessories that support each step, from preparation to the final coat.</p></header>{catalogueFilters.filter(item => item!=="All").map((name,index) => <Link key={name} href={`/catalogue?category=${encodeURIComponent(name)}`} className="tc-product-row"><span className="tc-index">{String(index+1).padStart(2,"0")}</span><h3>{name}</h3><p>{productDescriptions[name] || "Explore the products available for your project."}</p><ArrowUpRight size={18}/></Link>)}</section>
    <PaintJourney/>
    <GallerySection/>
    <section className="tc-section tc-suppliers" aria-labelledby="suppliers-title"><p className="tc-eyebrow">Working with familiar paint &amp; workshop ranges</p><h2 id="suppliers-title">The products you know.<br/><span>The support you need.</span></h2><div className="tc-supplier-rail">{[["Luxor","luxor.png"],["Kapci","kapci.png"],["Duram","duram.svg"],["Carvello","carvello.png"],["Klingspor","klingspor.png"],["Pratley","pratley.png"],["Farecla","farecla.jpg"]].map(([name,image]) => <img key={name} src={`/images/suppliers/${image}`} alt={name} width={160} height={70} loading="lazy"/>)}</div><p className="tc-section-description mx-auto">Ask the paint desk to confirm current stock and pricing.</p></section>
    {testimonials.length > 0 && <section id="testimonials" className="tc-section" aria-labelledby="reviews-title"><p className="tc-eyebrow">From our customers</p><h2 id="reviews-title">Local projects.<br/><span>Shared experiences.</span></h2><div className="tc-reviews">{(allReviews ? testimonials : testimonials.slice(0,3)).map(item => <blockquote key={item.name}><p>“{item.quote}”</p><cite>{item.name}</cite></blockquote>)}</div><button type="button" className="tc-text-link mt-8" aria-expanded={allReviews} onClick={() => setAllReviews(value => !value)}>{allReviews ? "Show fewer experiences" : "Read more customer experiences"}<ArrowRight size={16}/></button></section>}
    <section id="social-enquiries" className="tc-section tc-story" aria-labelledby="social-title"><img src={siteConfig.images.paintCans} alt="Automotive paint and workshop products" width={800} height={800} loading="lazy"/><div><p className="tc-eyebrow">TRUECOLOURS on TikTok</p><h2 id="social-title">Seen a product?<br/><span>Ask us about it.</span></h2><p className="tc-section-description">Send a screenshot, video, product name or code to the paint desk. We’ll help identify the product and check availability.</p><a href={siteConfig.social.tiktok} target="_blank" rel="noopener noreferrer" className="tc-text-link">Explore our TikTok<ArrowUpRight size={18}/></a><br/><a href={buildColourContactLink("Hi TRUECOLOURS, I saw a product on TikTok. Please help me check stock and pricing.")} className="tc-text-link">Ask about a product<ArrowRight size={18}/></a></div></section>
    <section className="tc-section tc-statement"><p>Start with a colour, a sample or a question.</p><h2>What are you<br/><span>working on next?</span></h2><Link href="/#contact" className="tc-button">Let’s find your finish<ArrowRight size={18}/></Link></section>
    <ContactSection/>
    <FAQSection/>
  </div>;
}
