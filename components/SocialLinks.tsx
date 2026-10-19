import React from "react";
import { siteConfig } from "@/config/site";

export function FacebookIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function TikTokIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.65 6.34 6.34 0 0 0 9.35 22a6.33 6.33 0 0 0 6.34-6.35V8.69a8.18 8.18 0 0 0 4.78 1.52v-3.48a4.85 4.85 0 0 1-.88-.04z" />
    </svg>
  );
}

export function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export const SOCIAL_PLATFORMS = [
  {
    name: "Facebook",
    href: siteConfig.social.facebook,
    icon: FacebookIcon,
    handle: "TRUECOLOURS Paints",
    bgHover: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    badgeBg: "bg-[#1877F2]",
    color: "#1877F2",
  },
  {
    name: "TikTok",
    href: siteConfig.social.tiktok,
    icon: TikTokIcon,
    handle: "@truecolours115",
    bgHover: "hover:bg-black hover:text-white hover:border-black",
    badgeBg: "bg-black",
    color: "#000000",
  },
  {
    name: "Instagram",
    href: siteConfig.social.instagram,
    icon: InstagramIcon,
    handle: "@truecolourspaints_",
    bgHover: "hover:bg-gradient-to-tr hover:from-[#fd5949] hover:via-[#d6249f] hover:to-[#285AEB] hover:text-white hover:border-transparent",
    badgeBg: "bg-gradient-to-tr from-[#fd5949] via-[#d6249f] to-[#285AEB]",
    color: "#E1306C",
  },
] as const;

export default function SocialLinks({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-9 w-9 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {SOCIAL_PLATFORMS.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow TRUECOLOURS on ${item.name}`}
            className={`flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-lg ${item.bgHover} ${sizeClasses[size]}`}
          >
            <Icon className={iconSizes[size]} />
          </a>
        );
      })}
    </div>
  );
}
