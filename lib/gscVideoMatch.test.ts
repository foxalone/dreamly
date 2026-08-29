import assert from "node:assert/strict";
import test from "node:test";

import {
  gscQueryCore,
  matchGscQueryToVideo,
  stripDreamSearchFiller,
} from "./gscVideoMatch";

const snakeVideo = {
  id: "ai:1",
  topic: "What does dreaming about snakes mean?",
  title: "Snake Dream Meaning",
};

const ghostVideo = {
  id: "free:2",
  topic: "Ghost dream meaning",
  title: "Seeing a ghost in a dream",
};

const weddingVideo = {
  id: "ai:3",
  topic: "Wedding dream meaning",
  title: "Dreaming of a wedding",
};

test("strips dream-search filler down to the symbol", () => {
  assert.equal(stripDreamSearchFiller("ghost dream meaning"), "ghost");
  assert.equal(gscQueryCore("What does dreaming about snakes mean?"), "snake");
  assert.equal(gscQueryCore("car accident dream islam"), "car accident");
});

test("marks a Google query when a video already covers that dream", () => {
  assert.equal(matchGscQueryToVideo("dream about snake", [snakeVideo])?.id, "ai:1");
  assert.equal(matchGscQueryToVideo("ghost dream meaning", [ghostVideo])?.id, "free:2");
  assert.equal(matchGscQueryToVideo("wedding dream", [weddingVideo])?.id, "ai:3");
});

test("does not mark unrelated queries as already filmed", () => {
  assert.equal(matchGscQueryToVideo("dreamly ai", [snakeVideo]), null);
  assert.equal(matchGscQueryToVideo("ride on a train", [ghostVideo]), null);
  assert.equal(matchGscQueryToVideo("snake in water in dream meaning", [snakeVideo]), null);
});
