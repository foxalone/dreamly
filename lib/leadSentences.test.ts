import assert from "node:assert/strict";
import test from "node:test";

import { splitLeadSentences } from "./leadSentences";

test("splits after the second sentence", () => {
  const text = "Few dream images divide people as sharply as the snake. One dreamer wakes fascinated, another in a cold sweat — and that split runs through the history of interpretation too. In ancient Greece snakes coiled around the staff of Asclepius.";
  const { lead, rest } = splitLeadSentences(text);
  assert.equal(lead, "Few dream images divide people as sharply as the snake. One dreamer wakes fascinated, another in a cold sweat — and that split runs through the history of interpretation too.");
  assert.equal(rest, "In ancient Greece snakes coiled around the staff of Asclepius.");
});

test("keeps everything in lead when there are fewer than three sentences", () => {
  assert.deepEqual(splitLeadSentences("One sentence."), { lead: "One sentence.", rest: "" });
  assert.deepEqual(splitLeadSentences("First one. Second one."), { lead: "First one. Second one.", rest: "" });
  assert.deepEqual(splitLeadSentences(""), { lead: "", rest: "" });
});

test("ignores abbreviations, initials and decimals", () => {
  const text = "You have to sit across from that person at a 10 a.m. meeting the next day. Awkward, e.g. when it was vivid. Then it fades. Later still.";
  const { lead, rest } = splitLeadSentences(text);
  assert.equal(lead, "You have to sit across from that person at a 10 a.m. meeting the next day. Awkward, e.g. when it was vivid.");
  assert.equal(rest, "Then it fades. Later still.");

  const decimals = "Roughly 3.5 percent of adults report it. Dr. Hall counted them. Nobody agreed.";
  assert.equal(splitLeadSentences(decimals).rest, "Nobody agreed.");
});

test("never splits inside a markdown link", () => {
  const text = "Compare it with [teeth falling out. A classic](/dreams/teeth-falling-out) too. Second sentence here! Third one.";
  const { lead, rest } = splitLeadSentences(text);
  assert.equal(lead, "Compare it with [teeth falling out. A classic](/dreams/teeth-falling-out) too. Second sentence here!");
  assert.equal(rest, "Third one.");
});

test("handles quotes, ellipses and non-Latin scripts", () => {
  const quoted = "He said “it is over.” She laughed… Then silence.";
  assert.deepEqual(splitLeadSentences(quoted), { lead: "He said “it is over.” She laughed…", rest: "Then silence." });

  const arabic = "رؤية الثعبان في المنام من أكثر الرؤى شيوعًا. يختلف تفسيرها باختلاف الحال؟ وهذا ما نشرحه هنا.";
  assert.equal(splitLeadSentences(arabic).rest, "وهذا ما نشرحه هنا.");

  const russian = "Змея во сне снится часто. Толкование зависит от деталей, т.е. от контекста. Разберём подробнее.";
  assert.equal(splitLeadSentences(russian).rest, "Разберём подробнее.");
});
