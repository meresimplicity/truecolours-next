"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SOCIAL_PLATFORMS } from "@/components/SocialLinks";

export default function Footer() {
  return <footer className="tc-footer">
    <div className="tc-footer-inner"><div className="tc-footer-grid">
      <div className="tc-footer-brand"><img src={siteConfig.images.logo} alt="TRUECOLOURS Automotive & Industrial Paints" width={800} height={240} loading="lazy"/><p className="tc-eyebrow">Automotive &amp; Industrial Paints</p><p>Bring the colour, code or project.<br/>We’ll help you find the right finish.</p><a href={`tel:${siteConfig.phonePrimaryRaw}`} className="tc-footer-phone">{siteConfig.phonePrimary}</a><div className="tc-footer-social">{SOCIAL_PLATFORMS.map(({name,href,icon:Icon}) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}><Icon className="h-4 w-4"/></a>)}</div></div>
      <div><h2>Explore</h2><nav aria-label="Footer links"><Link href="/find-my-colour">Find My Colour</Link><Link href="/catalogue">Product catalogue</Link><Link href="/#services">Our services</Link><Link href="/#how-it-works">How it works</Link><Link href="/#gallery">Gallery</Link></nav></div>
      <div><h2>Visit &amp; connect</h2><nav aria-label="Company links"><Link href="/#about">About TRUECOLOURS</Link><Link href="/#faq">Common questions</Link><Link href="/#contact">Contact &amp; directions</Link><a href={buildColourContactLink()}>WhatsApp the paint desk</a><Link href="/catalogue?account=login">My account</Link></nav><p className="tc-footer-address">Stand No 01 Ga-Thoka R71<br/>Mankweng, Limpopo</p></div>
    </div><div className="tc-footer-bottom"><p>© {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.</p><nav aria-label="Policies"><Link href="/privacy-policy">Privacy</Link><Link href="/refunds-returns">Returns</Link><Link href="/shipping-delivery-policy">Delivery</Link><Link href="/admin">Admin</Link></nav></div></div>
    <div className="tc-footer-outro" aria-hidden="true"><span>True colours.</span></div>
  </footer>;
}
