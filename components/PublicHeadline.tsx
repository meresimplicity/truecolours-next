"use client";

import { motion, useReducedMotion } from "framer-motion";

/** The same quiet word entrance used by the mere-simplicity reference. */
export function HeadlineLine({ text, offset = 0, muted = false }: { text: string; offset?: number; muted?: boolean }) {
  const reduced = useReducedMotion();
  return <span className={muted ? "tc-headline-line tc-headline-line--muted" : "tc-headline-line"}>{text.split(" ").map((word,index) => <motion.span key={`${word}-${index}`} className="tc-headline-word" initial={reduced ? false : {opacity:.72,y:24}} animate={{opacity:1,y:0}} transition={{type:"spring",stiffness:120,damping:22,delay:reduced ? 0 : Math.min((offset+index)*.032,.34)}}>{word}{index < text.split(" ").length-1 ? " " : ""}</motion.span>)}</span>;
}
