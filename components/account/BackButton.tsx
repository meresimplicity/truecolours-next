"use client";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-slate-100 bg-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8">
        <button
          onClick={handleBack}
          className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-700"
        >
          <ArrowLeft
            size={16}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
          Back to Website
        </button>
      </div>
    </motion.div>
  );
}
