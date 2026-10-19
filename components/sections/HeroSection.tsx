"use client";

import Link from "next/link";
import Image from "next/image";
import { HeadlineLine } from "@/components/PublicHeadline";
import { MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function HeroSection() {
  return <section id="home" aria-labelledby="hero-title" className="tc-hero">
    <Image src={siteConfig.images.heroBg} alt="" fill priority sizes="100vw" className="tc-hero-image" />
    <div className="tc-hero-inner">
      <h1 id="hero-title" aria-label="Automotive & Industrial Paints">
        <HeadlineLine text="AUTOMOTIVE &"/><br/><HeadlineLine text="INDUSTRIAL" offset={2} muted/><br/><HeadlineLine text="PAINTS" offset={3}/>
      </h1>
      <p className="tc-hero-established">EST 2022</p>
      <div className="tc-hero-actions"><Link href="/#contact" className="tc-button"><MapPin size={18}/>Find Our Store</Link></div>
    </div>
  </section>;
}
