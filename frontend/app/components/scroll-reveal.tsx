"use client";

import { useEffect } from "react";

// Brings elements marked with data-reveal into view as the page scrolls.
//
// The server markup is fully visible, so the page works without JavaScript and
// nothing flashes. After mount, anything that starts below the fold is marked
// "hidden", and an IntersectionObserver flips it to "shown" when it scrolls
// into view (the CSS in globals.css does the actual transition). Elements that
// are already on screen, or that the visitor has already scrolled past via an
// anchor link, are left alone.
//
// Reduced motion needs no special case here: the stylesheet turns the hidden
// state into a plain fade for those visitors, so they still get a gentle
// reveal without any movement.
export function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const viewportHeight = window.innerHeight;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealState = "shown";
          observer.unobserve(entry.target);
        }
      },
      // Fire a little before the element is fully in: it should already be
      // moving as it arrives, not start once it is sitting there.
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top < viewportHeight * 0.9) return;
      el.dataset.revealState = "hidden";
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
