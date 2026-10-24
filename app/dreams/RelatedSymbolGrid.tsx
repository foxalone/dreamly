"use client";

import { Children, Fragment, useEffect, useState, type ReactNode } from "react";

export default function RelatedSymbolGrid({ children, ad }: { children: ReactNode; ad: ReactNode }) {
  const cards = Children.toArray(children);
  const count = cards.length;
  const [adIndex, setAdIndex] = useState<number | null>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    // Choose once per mobile visit; resizing within mobile keeps the same slot.
    const mobileIndex = Math.floor(Math.random() * (count + 1));
    const update = () => setAdIndex(desktop.matches ? count : mobileIndex);
    const frame = requestAnimationFrame(update);
    desktop.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      desktop.removeEventListener("change", update);
    };
  }, [count]);

  if (adIndex !== null) cards.splice(adIndex, 0, <Fragment key="related-ad-slot">{ad}</Fragment>);

  return <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards}</div>;
}
