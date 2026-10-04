/** Homepage map keywords are not semantic symbols, including in legacy imports. */
export function needsImportedRootRepair(item: { fromHomeAsk?: boolean; rootsVersion?: number }): boolean {
  return item.fromHomeAsk === true && item.rootsVersion !== 1;
}
