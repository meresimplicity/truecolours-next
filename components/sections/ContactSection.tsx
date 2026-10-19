"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function ContactSection() {
  const [message,setMessage] = useState("");
  const [copied,setCopied] = useState(false);
  async function copyAddress() {
    try { await navigator.clipboard.writeText(siteConfig.location); setCopied(true); setMessage("Store address copied."); }
    catch { setCopied(false); setMessage("Copy is unavailable. Select the address to copy it manually."); }
  }
  return <section id="contact" className="tc-section tc-contact" aria-labelledby="contact-title"><div><p className="tc-eyebrow">Start a conversation</p><h2 id="contact-title">What finish<br/><span>do you have<br/>in mind?</span></h2><p className="tc-section-description">Send your paint code, sample, panel photo or product request. A few details are enough to start.</p><p className="tc-section-description">Walk in at our Mankweng store, call the counter or speak to the paint desk on WhatsApp.</p><div className="mt-8"><a href={buildColourContactLink("Hi TRUECOLOURS, I need help with a paint or refinish project.")} className="tc-button">Talk to the paint desk<ArrowRight size={17}/></a></div></div><div className="tc-contact-info"><div className="tc-contact-row"><p className="tc-eyebrow">Visit our store</p><h3>Stand No 01 Ga-Thoka R71</h3><p>Mankweng, Limpopo</p><a href={siteConfig.mapUrl} target="_blank" rel="noopener noreferrer" className="tc-text-link">Get directions<ArrowUpRight size={16}/></a><button type="button" onClick={copyAddress} className="tc-text-link">{copied ? "Copied" : "Copy address"}{copied ? <Check size={15}/> : <Copy size={15}/>}</button><p role="status" aria-live="polite">{message}</p></div><div className="tc-contact-row"><p className="tc-eyebrow">Call the counter</p><h3><a href={`tel:${siteConfig.phonePrimaryRaw}`}>{siteConfig.phonePrimary}</a></h3><p><a href={`tel:${siteConfig.phoneSecondaryRaw}`}>{siteConfig.phoneSecondary}</a></p></div><div className="tc-contact-row"><p className="tc-eyebrow">Stock &amp; pricing</p><p>Send the product name, code or photo. We’ll confirm availability and help arrange collection or discuss delivery.</p></div><iframe title="TRUECOLOURS store location in Mankweng" src={siteConfig.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="tc-map"/></div></section>;
}
