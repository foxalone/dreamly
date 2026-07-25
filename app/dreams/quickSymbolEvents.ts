export const QUICK_SYMBOL_OPEN_EVENT = "dreamly:openQuickSymbol";

export type QuickSymbolOpenDetail = {
  query?: string;
};

export function openQuickSymbol(query?: string) {
  window.dispatchEvent(
    new CustomEvent<QuickSymbolOpenDetail>(QUICK_SYMBOL_OPEN_EVENT, {
      detail: { query },
    }),
  );
}
