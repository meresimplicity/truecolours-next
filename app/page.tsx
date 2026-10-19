import Navbar from "@/components/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import CompanyHome from "@/components/sections/CompanyHome";
import { PaintAmbientBackground } from "@/components/PaintAmbientBackground";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function Home() {
  return <div className="public-site min-h-screen"><a href="#main-content" className="skip-link">Skip to content</a><PaintAmbientBackground/><Navbar/><main id="main-content" tabIndex={-1}><HeroSection/><CompanyHome/></main><Footer/><WhatsAppButton/></div>;
}
