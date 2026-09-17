import { Fragment } from "react";
import { isKnownGuideHref, parseGuideText } from "@/lib/guideLinks";
import LocaleLink from "@/lib/i18n/LocaleLink";

/**
 * Renders dictionary / guide prose. `[label](/dreams/slug)` becomes a locale-aware link
 * when the target is a known page; everything else (including prose without markup) is plain text.
 */
export default function LinkedText({ text }: { text: string }) {
  return (
    <>
      {parseGuideText(text).map((segment, index) =>
        segment.kind === "link" && isKnownGuideHref(segment.href) ? (
          <LocaleLink
            key={index}
            href={segment.href}
            className="font-medium text-[var(--dd-accent-text)] underline decoration-[var(--dd-border-strong)] underline-offset-4 transition hover:decoration-current"
          >
            {segment.text}
          </LocaleLink>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
