import assert from "node:assert/strict";
import test from "node:test";
import { offerwallVisible } from "./offerwallVisibility";

test("ad completion detects full-sized Google containers hidden directly or through a parent", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  type Node = { className: string; id: string; hidden: boolean; parentElement: Node | null; style: Record<string, string>; getBoundingClientRect: () => { width: number; height: number } };
  const parent: Node = { className: "", id: "", hidden: false, parentElement: null, style: {}, getBoundingClientRect: () => ({ width: 900, height: 700 }) };
  const overlay: Node = { ...parent, className: "fc-dialog-container", parentElement: parent, style: {} };
  const root = { querySelectorAll: () => [overlay] } as unknown as Document;
  Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: (node: Node) => ({ display: "block", visibility: "visible", opacity: "1", ...node.style }) });
  try {
    assert.equal(offerwallVisible(root), true);
    for (const node of [overlay, parent]) {
      const hiddenStyles: Record<string, string>[] = [{ opacity: "0" }, { visibility: "hidden" }, { display: "none" }, { contentVisibility: "hidden" }];
      for (const style of hiddenStyles) {
        node.style = style;
        assert.equal(offerwallVisible(root), false);
        node.style = {};
      }
      node.hidden = true;
      assert.equal(offerwallVisible(root), false);
      node.hidden = false;
    }
    assert.equal(offerwallVisible(root), true);
    overlay.getBoundingClientRect = () => ({ width: 1, height: 1 });
    assert.equal(offerwallVisible(root), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "getComputedStyle", previous);
    else Reflect.deleteProperty(globalThis, "getComputedStyle");
  }
});
