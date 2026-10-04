/** Homepage map keywords are not semantic symbols, including in legacy imports. */
export function needsImportedRootRepair(item: { fromHomeAsk?: boolean; rootsVersion?: number }): boolean {
  return item.fromHomeAsk === true && item.rootsVersion !== 1;
}

/** Root repair alone did not generate emojis or renderable icons in older imports. */
export function needsImportedVisualRepair(item: {
  fromHomeAsk?: boolean;
  rootsVersion?: number;
  visualsVersion?: number;
}): boolean {
  return item.fromHomeAsk === true && (needsImportedRootRepair(item) || item.visualsVersion !== 1);
}
