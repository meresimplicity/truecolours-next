"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Lock scrolling, contain keyboard focus, and return focus to the opener. */
export function useModalFocus(open: boolean, container: RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () => Array.from(container.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    ) ?? []).filter((element) => element.getClientRects().length > 0);

    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      const outside = !container.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, container]);
}
