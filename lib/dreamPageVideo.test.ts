import assert from "node:assert/strict";
import test from "node:test";
import { isoDurationSeconds, parseYouTubeId, videoMinutes } from "./dreamPageVideo";

test("parseYouTubeId accepts every usual link shape and rejects the rest", () => {
  const id = "dQw4w9WgXcQ";
  for (const input of [
    id,
    `https://www.youtube.com/watch?v=${id}&t=42s`,
    `youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `  https://youtu.be/${id}  `,
  ]) {
    assert.equal(parseYouTubeId(input), id, input);
  }
  for (const input of ["", "hello", "https://vimeo.com/123", `https://evil.com/watch?v=${id}`, "https://youtu.be/short"]) {
    assert.equal(parseYouTubeId(input), "", input);
  }
});

test("durations: ISO 8601 → seconds → rounded minutes", () => {
  assert.equal(isoDurationSeconds("PT4M12S"), 252);
  assert.equal(isoDurationSeconds("PT1H2M"), 3720);
  assert.equal(isoDurationSeconds(""), 0);
  assert.equal(videoMinutes("PT4M12S"), 4);
  assert.equal(videoMinutes("PT4M40S"), 5);
  assert.equal(videoMinutes("PT20S"), 1);
  assert.equal(videoMinutes(""), 0);
});
