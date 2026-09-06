"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { localePath } from "./path";
import { useLocale } from "./LocaleProvider";

type Props = ComponentProps<typeof Link>;

/** Drop-in Link that prefixes the active locale. Use this for every internal href. */
export default function LocaleLink({ href, ...props }: Props) {
  const locale = useLocale();
  const nextHref = typeof href === "string" ? localePath(href, locale) : href;
  return <Link href={nextHref} {...props} />;
}
