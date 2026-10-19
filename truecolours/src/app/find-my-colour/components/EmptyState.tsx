"use client";

export function EmptyState({ message, whatsAppLink }: { message: string; whatsAppLink: string }) {
  return (
    <div className="border border-line rounded-card bg-white p-6 text-center flex flex-col items-center gap-3">
      <p className="text-steel max-w-md">{message}</p>
      <a
        href={whatsAppLink}
        target="_blank"
        rel="noreferrer"
        className="px-4 py-2 rounded-card bg-signal text-white font-display text-sm hover:bg-signal-dark transition-colors"
      >
        Ask TRUECOLOURS on WhatsApp
      </a>
    </div>
  );
}
