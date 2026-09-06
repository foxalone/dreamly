import type { DreamLens } from "@/lib/dream-lenses";

export const QUICK_SYMBOL_OPEN_EVENT = "dreamly:openQuickSymbol";

export type QuickSymbolOpenDetail = {
  query?: string;
  lens?: DreamLens;
};

export function openQuickSymbol(query?: string, lens?: DreamLens) {
  window.dispatchEvent(
    new CustomEvent<QuickSymbolOpenDetail>(QUICK_SYMBOL_OPEN_EVENT, {
      detail: { query, lens },
    }),
  );
}
