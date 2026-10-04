import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DreamSymbolIcons } from "../app/components/DreamSymbolIcons";
import { DREAM_ICONS_EN, pickDreamIconsEn } from "./dream-icons/dreamIcons.en";
import { filterIconsWithGlyph, normalizeForIconsEn } from "./dreamVisuals";
import { needsImportedRootRepair, needsImportedVisualRepair } from "./importedDreamRoots";

test("forest roots survive filtering and render the actual SVG icon", () => {
  const keys = filterIconsWithGlyph(
    pickDreamIconsEn(normalizeForIconsEn("forest darkness"), 1), DREAM_ICONS_EN, 1
  );
  assert.deepEqual(keys, ["forest"]);
  const html = renderToStaticMarkup(createElement(DreamSymbolIcons, { keys }));
  assert.match(html, /<svg/);
  assert.match(html, /lucide-tree-pine/);
});

test("unknown stored icons do not prevent valid icons from rendering", () => {
  const html = renderToStaticMarkup(createElement(DreamSymbolIcons, { keys: ["unknown", "forest"] }));
  assert.equal((html.match(/<svg/g) ?? []).length, 1);
});

test("a dream with repaired words still gets visual repair, then stops retrying", () => {
  const dream = { fromHomeAsk: true, rootsVersion: 1 };
  assert.equal(needsImportedRootRepair(dream), false);
  assert.equal(needsImportedVisualRepair(dream), true);
  assert.equal(needsImportedVisualRepair({ ...dream, visualsVersion: 1 }), false);
  assert.equal(needsImportedVisualRepair({ fromHomeAsk: true }), true);
  assert.equal(needsImportedVisualRepair({}), false);
});
