import { buildColourContactLink } from "@/lib/whatsapp";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Do I need my car paint code?",
    a: "It helps, but it is not required. You can also bring a fuel cap, colour sample, or painted panel so the colour can be checked and matched.",
  },
  {
    q: "Do you only sell paint?",
    a: "No. TRUECOLOURS also supplies hardeners, thinners, primers, fillers, abrasives, masking products, solvents, polishing products, and workshop supplies.",
  },
  {
    q: "Do you stock 2K products?",
    a: "Yes. We supply 2K paint systems, clearcoats, hardeners, primers, thinners, and related refinish products.",
  },
  {
    q: "Can you help me choose the right thinner or hardener?",
    a: "Yes. Tell us the paint system or product you are using and we will help you choose the correct supporting product.",
  },
  {
    q: "Do you sell body fillers and putties?",
    a: "Yes. We supply body fillers, micro fine stoppers, spray fillers, spot putties, fibreglass fillers, and repair materials.",
  },
  {
    q: "Do you supply masking and sanding products?",
    a: "Yes. We supply masking tape, masking film, sandpaper, sanding discs, abrasives, pads, and related surface preparation products.",
  },
  {
    q: "Can I ask for supplier products by code?",
    a: "Yes. Send us the product code, name, or picture on WhatsApp and we will check availability.",
  },
  {
    q: "Do you show prices online?",
    a: "No. Supplier prices and stock change, so customers should WhatsApp or visit for current pricing.",
  },
  {
    q: "Where are you located?",
    a: "We are at Stand No 01 Ga-Thoka R71, Mankweng, Limpopo. Walk-ins are welcome.",
  },
];

export default function FAQSection() {
  return <section id="faq" className="tc-section tc-faq" aria-labelledby="faq-title"><div className="tc-faq-intro"><p className="tc-eyebrow">A few useful answers</p><h2 id="faq-title">Common<br/><span>questions.</span></h2><p className="tc-section-description">Everything you need to know before a visit or product enquiry.</p><a href={buildColourContactLink()} className="tc-text-link mt-5">Still have a question? Talk to us.</a></div><div>{FAQS.map(({q,a}) => <details key={q}><summary>{q}<Plus size={17} aria-hidden="true"/></summary><p>{a}</p></details>)}</div></section>;
}
