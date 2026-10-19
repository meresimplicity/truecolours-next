"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buildColourContactLink } from "@/lib/whatsapp";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { siteConfig } from "@/config/site";
import { useModalFocus } from "@/lib/hooks/useModalFocus";

const catalogueLinks = [
  ["All products", "/catalogue"],
  ["Paint systems", "/catalogue?category=Paint+Systems"],
  ["Prep & repair", "/catalogue?category=Prep+%26+Repair"],
  ["Industrial coatings", "/catalogue?category=Industrial"],
  ["Solvents & thinners", "/catalogue?category=Solvents"],
  ["Abrasives & sanding", "/catalogue?category=Abrasives"],
  ["Masking", "/catalogue?category=Masking"],
  ["Tools & supplies", "/catalogue?category=Tools+%26+Supplies"],
] as const;
const companyLinks = [["About TRUECOLOURS", "/#about"], ["Our process", "/#how-it-works"], ["Gallery", "/#gallery"], ["Common questions", "/#faq"], ["Visit our store", "/#contact"]] as const;
type MenuName = "catalogue" | "company";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuName | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<MenuName | null>(null);
  const menuRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpened = useRef<MenuName | null>(null);
  const reduced = useReducedMotion();
  const closeMenus = () => { setMobileOpen(false); setActiveMenu(null); setExpandedMobile(null); };
  useModalFocus(mobileOpen, menuRef, () => {
    if (expandedMobile) {
      setExpandedMobile(null);
      menuRef.current?.querySelector<HTMLButtonElement>(`[data-mobile-menu-trigger="${expandedMobile}"]`)?.focus();
    } else closeMenus();
  });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const hero = document.getElementById("home");
      setScrolled(hero ? hero.getBoundingClientRect().bottom <= (headerRef.current?.offsetHeight ?? 96) : window.scrollY > 24);
      frame = 0;
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", scroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); };
  }, []);
  useEffect(() => { closeMenus(); }, [pathname]);
  useEffect(() => {
    const media = matchMedia("(min-width: 1024px)");
    const resize = () => { setActiveMenu(null); if (media.matches) setMobileOpen(false); };
    media.addEventListener("change", resize);
    return () => { media.removeEventListener("change", resize); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);
  useEffect(() => {
    if (!activeMenu) return;
    const outside = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) setActiveMenu(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setActiveMenu(null);
      headerRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${activeMenu}"]`)?.focus();
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [activeMenu]);

  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const logo = <img src={siteConfig.images.logo} alt="TRUECOLOURS Automotive & Industrial Paints" width={800} height={240} fetchPriority="high" className="tc-nav-logo" />;
  const dropdown = (name: MenuName, label: string) => (
    <div className="tc-nav-group" onPointerEnter={(event) => {
      if (event.pointerType !== "mouse") return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (activeMenu !== name) hoverOpened.current = name;
      setActiveMenu(name);
    }} onPointerLeave={(event) => {
      if (event.pointerType !== "mouse") return;
      hoverOpened.current = null;
      const root = event.currentTarget;
      closeTimer.current = setTimeout(() => { if (!root.contains(document.activeElement)) setActiveMenu(current => current === name ? null : current); }, 140);
    }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveMenu(current => current === name ? null : current); }}>
      <button type="button" data-menu-trigger={name} aria-expanded={activeMenu === name} aria-controls={activeMenu === name ? `tc-${name}-menu` : undefined}
        className={`tc-nav-link ${activeMenu === name || (name === "catalogue" && active("/catalogue")) ? "is-active" : ""}`}
        onClick={(event) => { if (closeTimer.current) clearTimeout(closeTimer.current); const keep = event.detail > 0 && hoverOpened.current === name; hoverOpened.current = null; setActiveMenu(current => keep ? name : current === name ? null : name); }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault(); setActiveMenu(name);
          const last = event.key === "ArrowUp";
          requestAnimationFrame(() => { const links = document.getElementById(`tc-${name}-menu`)?.querySelectorAll<HTMLAnchorElement>("a"); (last ? links?.[links.length - 1] : links?.[0])?.focus(); });
        }}>{label}</button>
      <AnimatePresence>{activeMenu === name && <motion.div id={`tc-${name}-menu`} className="tc-word-menu" initial={reduced ? false : {opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:reduced ? 0 : .24}}>
        {(name === "catalogue" ? catalogueLinks : companyLinks).map(([title, href], index) => <motion.div key={href} initial={reduced ? false : {opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:reduced ? 0 : index*.06}}><Link href={href} onClick={closeMenus}>{title}</Link></motion.div>)}
      </motion.div>}</AnimatePresence>
    </div>
  );

  return <header ref={headerRef} className={`tc-site-header ${scrolled || pathname !== "/" || activeMenu || mobileOpen ? "is-scrolled" : "is-hero"}`}>
    <AnimatePresence>{activeMenu && <motion.button type="button" tabIndex={-1} aria-label="Close dropdown menu" className="tc-nav-backdrop" onClick={() => setActiveMenu(null)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />}</AnimatePresence>
    <div className="tc-header-inner">
      <Link href="/" aria-label="TRUECOLOURS home" onClick={closeMenus} className="tc-brand">{logo}</Link>
      <nav aria-label="Main navigation" className="tc-desktop-nav">
        <Link href="/" aria-current={active("/") ? "page" : undefined} className={`tc-nav-link ${active("/") ? "is-active" : ""}`}>Home</Link>
        <Link href="/find-my-colour" aria-current={active("/find-my-colour") ? "page" : undefined} className={`tc-nav-link ${active("/find-my-colour") ? "is-active" : ""}`}>Find My Colour</Link>
        {dropdown("catalogue", "Catalogue")}
        <Link href="/#services" className="tc-nav-link">Services</Link>
        {dropdown("company", "Company")}
      </nav>
      <div className="tc-header-actions"><div className="tc-header-account"><AccountMenu compact /></div><Link href={buildColourContactLink()} className="tc-button tc-button--small">Get in touch</Link>
        <button type="button" className="tc-menu-trigger tc-icon-button" aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
      </div>
    </div>
    <AnimatePresence>{mobileOpen && <>
      <motion.button type="button" tabIndex={-1} aria-label="Dismiss navigation" className="tc-mobile-backdrop" onClick={closeMenus} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />
      <motion.aside ref={menuRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Site navigation" className="tc-mobile-menu" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{duration:reduced ? 0 : .35}}>
        <div className="tc-mobile-menu-top"><Link href="/" onClick={closeMenus} aria-label="TRUECOLOURS home">{logo}</Link><button type="button" aria-label="Close navigation menu" onClick={closeMenus} className="tc-icon-button"><X size={20}/></button></div>
        <nav aria-label="Mobile navigation" className="tc-mobile-menu-body"><p className="tc-eyebrow">Explore</p>
          {[["Home","/"], ["Find My Colour","/find-my-colour"], ["Catalogue","catalogue"], ["Services","/#services"], ["Company","company"]].map(([label,href],index) => {
            const isMenu = href === "catalogue" || href === "company";
            return <div key={href} className="tc-mobile-nav-row">{isMenu ? <><button type="button" data-mobile-menu-trigger={href} aria-expanded={expandedMobile === href} aria-controls={`tc-mobile-${href}`} onClick={() => setExpandedMobile(current => current === href ? null : href as MenuName)}><span className="tc-index">0{index+1}</span><span>{label}</span><ArrowRight size={17} className={expandedMobile === href ? "rotate-90" : ""}/></button>{expandedMobile === href && <div id={`tc-mobile-${href}`} className="tc-mobile-submenu">{(href === "catalogue" ? catalogueLinks : companyLinks).map(([title,url]) => <Link key={url} href={url} onClick={closeMenus}>{title}</Link>)}</div>}</> : <Link href={href} onClick={closeMenus}><span className="tc-index">0{index+1}</span><span>{label}</span><ArrowRight size={17}/></Link>}</div>;
          })}
          <div className="tc-mobile-account"><AccountMenu mobile onNavigate={closeMenus}/></div>
        </nav>
        <div className="tc-mobile-menu-bottom"><Link href={buildColourContactLink()} onClick={closeMenus} className="tc-button">Get in touch<ArrowRight size={17}/></Link></div>
      </motion.aside>
    </>}</AnimatePresence>
  </header>;
}
