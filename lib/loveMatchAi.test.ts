import assert from "node:assert/strict";
import test from "node:test";
import { loveMatchCanonical, loveMatchPrompt, parseAiLoveMatch, validAiLoveMatch, validLoveMatchInput } from "./loveMatchAi";

const input = {
  locale: "ru" as const, you: "Аня", them: "Макс", firstBirthday: "1992-05-10", secondBirthday: "1991-11-20",
  firstGender: "woman" as const, secondGender: "man" as const, firstStory: "Мне важно уважение.",
  secondStory: "Мы недавно познакомились.", status: "dating" as const,
};

test("validates bounded Love Match input and keeps personal context in the prompt", () => {
  assert.equal(validLoveMatchInput(input), true);
  assert.equal(validLoveMatchInput({ ...input, firstGender: "other" }), false);
  assert.equal(validLoveMatchInput({ ...input, firstStory: "a".repeat(801) }), false);
  assert.equal(validLoveMatchInput({ ...input, firstBirthday: "2035-01-01" }), false);
  assert.equal(validLoveMatchInput({ ...input, firstPhoto: "data:image/png;base64,AAAA" }), false);
  assert.equal(validLoveMatchInput({ ...input, firstPhoto: `data:image/jpeg;base64,${"A".repeat(900_004)}` }), false);
  assert.equal(validLoveMatchInput({ ...input, firstPhoto: "data:image/jpeg;base64,/9j/2Q==" }), true);
  const prompt = loveMatchPrompt(input);
  assert.match(prompt.system, /Russian/);
  assert.match(prompt.user, /Мне важно уважение/);
  assert.match(prompt.user, /"zodiac":"taurus"/);
});

test("treats the same entered data as one reading and a changed detail as another", () => {
  assert.equal(loveMatchCanonical(input), loveMatchCanonical({ ...input, firstPhoto: null }));
  assert.equal(loveMatchCanonical(input), loveMatchCanonical({ ...input }));
  assert.notEqual(loveMatchCanonical(input), loveMatchCanonical({ ...input, secondStory: "Другая история." }));
  assert.notEqual(loveMatchCanonical(input), loveMatchCanonical({ ...input, firstPhoto: "data:image/jpeg;base64,/9j/2Q==" }));
});

test("accepts only complete bounded AI scores and derives the overall average", () => {
  const result = {
    scores: { emotional: 70, communication: 80, romance: 60, trust: 90, longTerm: 50, values: 70 },
    summary: "Разбор", strength: "Сильная сторона", growth: "Тема для разговора", reflection: "Что важно?",
  };
  assert.equal(parseAiLoveMatch(JSON.stringify(result))?.overall, 70);
  assert.equal(validAiLoveMatch(parseAiLoveMatch(JSON.stringify(result))), true);
  assert.equal(validAiLoveMatch({ ...parseAiLoveMatch(JSON.stringify(result)), overall: 99 }), false);
  assert.equal(parseAiLoveMatch(JSON.stringify({ ...result, scores: { ...result.scores, trust: 150 } })), null);
  assert.equal(parseAiLoveMatch(JSON.stringify({ ...result, reflection: "" })), null);
});
