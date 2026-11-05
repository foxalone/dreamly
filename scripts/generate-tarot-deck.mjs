#!/usr/bin/env node
// Generate the remaining Major Arcana with the same Vertex image endpoint as ai-image-worker.
// Usage: node scripts/generate-tarot-deck.mjs --generate --card=magician
//        node scripts/generate-tarot-deck.mjs --generate --all
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { cert } from "firebase-admin/app";
import sharp from "sharp";

const subjects = {
  magician: ["The Magician", "A charismatic young mage at a carved stone altar raises a glowing wand toward the sky while the other hand points to the earth. On the altar, four distinct objects: a cup, a sword, a pentacle disk, and a wooden wand. A subtle infinity halo above the head; climbing roses and lilies. The raised and lowered hands and all four tools must be visible."],
  priestess: ["The High Priestess", "A serene mysterious woman seated between one dark pillar and one pale pillar in a moonlit temple. A crescent moon at her feet, a closed scroll resting on her lap, a translucent veil behind her with pomegranate vines. Balanced symmetrical composition, quiet wisdom; no writing on the scroll."],
  empress: ["The Empress", "A warm regal woman seated in a lush moonlit garden of wheat, wildflowers, and flowing water. Crown of twelve small stars, embroidered gown, one hand resting on fertile earth, a distant forest. Maternal abundance, natural beauty, gentle authority; the garden and crown are unmistakable."],
  emperor: ["The Emperor", "A dignified older ruler seated upright on a monumental stone throne carved with ram motifs, rugged mountains behind him. Deep red mantle over armor, scepter in one hand and orb in the other. Strong geometric composition, stability and command, no crown of playing-card style."],
  hierophant: ["The Hierophant", "A wise ceremonial teacher seated in a gothic sanctuary between two tall pillars, two respectful students below. One hand raised in blessing, an ornate staff in the other, two crossed golden keys at his feet. Detailed robes, warm candlelight, sacred learning without any written symbols."],
  lovers: ["The Lovers", "Two fully clothed adults face each other in a flowering garden beneath a radiant angelic figure high in the sky. Two distinct trees frame them, one flowering and one bearing fruit. Their hands nearly meet; the scene conveys choice, trust, and connection, with elegant gothic romanticism, no nudity."],
  chariot: ["The Chariot", "A determined armored rider stands in a lavish ceremonial chariot beneath a canopy of stars. One black sphinx and one white sphinx pull the chariot in different directions, a walled city behind. Forward motion, reins and contrasting sphinxes clearly visible, heroic but refined."],
  strength: ["Strength", "A gentle woman calmly closes or strokes the jaws of a powerful golden lion in a moonlit rose garden. Her expression is peaceful, not combative; a subtle infinity halo over her head. The lion is unmistakable and their interaction shows courage through compassion."],
  hermit: ["The Hermit", "An elderly solitary seeker stands on a snowy mountain ledge in a hooded charcoal robe, holding a tall staff and a lantern with a six-pointed light. Misty peaks fall away below, quiet night sky. The lantern illuminates his thoughtful face and the mountain path."],
  wheel: ["Wheel of Fortune", "A magnificent intricate golden wheel turns among storm clouds and stars, with a small sphinx perched at its top and a serpent winding down one side. Four winged symbolic creatures in the distant corners. The wheel dominates the composition; no writing, letters, numbers, or labels on it."],
  justice: ["Justice", "A poised androgynous judge sits between two dark stone pillars, holding balanced golden scales in one hand and an upright sword in the other. Crimson and indigo robes, direct calm gaze, clean symmetry, moonlit gothic hall. Scales and sword must be clearly distinct."],
  hanged: ["The Hanged Man", "A calm young figure hangs upside down by one ankle from a living tree, free leg bent into a cross shape, arms loosely behind the back. A soft golden halo around the head; peaceful expression, misty woodland below. Show suspension and reversed perspective clearly; no violence or distress."],
  death: ["Death", "An armored skeletal rider on a white horse carries a dark banner marked only with a single white rose, crossing a misty field at dawn. A river and rising sun beyond; a few distant figures respectfully watch. Symbolic transformation, solemn and beautiful, not gory or frightening."],
  temperance: ["Temperance", "A luminous winged angel stands with one foot in a clear stream and one on the grassy bank, carefully pouring water between two golden chalices. A path leads toward a distant rising sun. Calm precise movement, blue-violet and pale gold, both chalices and flowing water clearly visible."],
  devil: ["The Devil", "A majestic horned shadow figure stands on a dark stone pedestal inside an ancient cavern, with two fully clothed human silhouettes loosely linked to the pedestal by openable chains. Torchlight and purple smoke, symbolic temptation and attachment, sophisticated and eerie rather than horror, gore, or explicit content."],
  tower: ["The Tower", "A fork of lightning strikes the crown of a tall gothic stone tower on a lonely mountain, its upper stones breaking into glowing fragments. Two small cloaked figures flee safely down the slope. Storm clouds, dramatic diagonal energy, clear tower silhouette, beautiful cinematic atmosphere without gore."],
  star: ["The Star", "A fully clothed woman kneels beside a still reflective pool under an immense eight-pointed star and seven smaller stars. She pours water from two vessels, one into the pool and one onto the earth. Soft starlight, iris flowers, peaceful hope; vessels and star pattern clearly visible."],
  moon: ["The Moon", "A winding path runs between two tall stone towers toward a huge luminous moon. In the foreground a wolf and a white dog howl on opposite sides of a pool, and a small crayfish emerges from the water. Blue-violet night, dreamlike uncertainty, all three animals and towers visible."],
  sun: ["The Sun", "A joyful child in a flowing white tunic rides a calm white horse past tall sunflowers, holding a small crimson banner. A huge radiant golden sun fills the upper sky; warm light breaks through the deck's blue-violet gothic palette. Innocent confidence, unmistakable horse, sunflowers, and sun."],
  judgement: ["Judgement", "A luminous winged angel in the clouds blows a long golden trumpet as several fully clothed people below rise from shadow into dawn light in a gothic valley. The image conveys awakening and renewal, not horror. Trumpet, angel, and responding figures must be clearly visible."],
  world: ["The World", "A graceful fully clothed dancer floats within a large oval laurel wreath in a starry cosmic sky, holding two short ceremonial wands. Four small symbolic creatures occupy the corners: human, eagle, lion, and bull. A sense of completion and celebration, elegant balanced composition."],
};

const args = new Set(process.argv.slice(2));
const cardArg = [...args].find((arg) => arg.startsWith("--card="));
const selected = args.has("--all") ? Object.keys(subjects) : cardArg ? [cardArg.slice(7)] : [];
if (!args.has("--generate") || !selected.length || selected.some((id) => !subjects[id])) {
  throw new Error("Specify --generate with --all or --card=<major-arcana-id>. Each image is a paid Vertex request.");
}

nextEnv.loadEnvConfig(process.cwd());
const accountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!accountPath) throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is required");
const account = JSON.parse(readFileSync(path.resolve(accountPath), "utf8"));
const project = process.env.VEO_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || account.project_id;
const model = process.env.VEO_IMAGE_MODEL || "gemini-3.1-flash-image";
const location = process.env.VEO_IMAGE_LOCATION || "global";
const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
const endpoint = `https://${host}/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
const source = path.resolve("public/tarot/major-arcana/fool.webp");
const reference = readFileSync(source).toString("base64");
const outputDir = path.resolve("public/tarot/major-arcana");
mkdirSync(outputDir, { recursive: true });
const access = await cert(account).getAccessToken();
if (!access?.access_token) throw new Error("Vertex access token unavailable");

function promptFor(id) {
  const [name, scene] = subjects[id];
  return `Create one original full-bleed portrait illustration for Major Arcana ${name}. The attached approved Fool card is a VISUAL STYLE reference only: preserve its painterly cinematic quality, ornate costuming, luminous atmosphere, elegant detail, and coherent lavender, midnight blue, burgundy, and gold palette. Do not copy its traveler, dog, rose, cliff, title, numeral, or border.\n\nTraditional tarot symbolism for THIS card must be immediately recognizable: ${scene}\n\nPremium semi-realistic gothic-romantic dream art, the same sophisticated visual world as a dark fantasy dream gallery, with atmospheric depth, realistic textures, soft volumetric light, and restrained magical glow. Portrait 9:16 composition. Keep essential objects away from the top 8% and bottom 17% where the website will overlay its own numeral and title. The subject must read clearly as a small card thumbnail. No built-in card frame, border, title, words, letters, numerals, logo, or watermark. Avoid anime, flat vector art, cheap fantasy illustration, and clutter.`;
}

async function generate(id) {
  const output = path.join(outputDir, `${id}.webp`);
  if (existsSync(output) && !args.has("--replace")) {
    console.log(`${id}: already exists; skipped`);
    return;
  }
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [
      { text: promptFor(id) },
      { inlineData: { mimeType: "image/webp", data: reference } },
    ] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "9:16", imageSize: "1K" } },
  });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${access.access_token}`, "x-goog-user-project": project, "Content-Type": "application/json; charset=utf-8" },
        body,
        signal: AbortSignal.timeout(180_000),
      });
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${String(payload?.error?.message || "image request failed").slice(0, 240)}`);
        error.status = response.status;
        throw error;
      }
      const image = [...(payload?.candidates?.[0]?.content?.parts || [])].reverse().map((part) => part.inlineData || part.inline_data).find((part) => part?.data);
      if (!image) throw new Error(`No image returned (${payload?.candidates?.[0]?.finishReason || "unknown"})`);
      const buffer = await sharp(Buffer.from(image.data, "base64")).webp({ quality: 88, effort: 6 }).toBuffer();
      writeFileSync(output, buffer);
      console.log(`${id}: saved ${buffer.length} bytes; ${payload?.usageMetadata?.candidatesTokenCount || "?"} output tokens`);
      return;
    } catch (error) {
      if (attempt === 5 || (error.status && ![429, 500, 502, 503, 504].includes(error.status))) throw new Error(`${id}: ${error.message}`);
      const waitMs = error.status === 429 ? Math.min(90_000, 20_000 * (attempt + 1)) : 2_000 * (2 ** attempt);
      console.log(`${id}: waiting ${Math.round(waitMs / 1000)}s after ${error.status || "network error"}`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

for (const id of selected) {
  if (existsSync(path.join(outputDir, `${id}.webp`)) && !args.has("--replace")) {
    console.log(`${id}: already exists; skipped`);
    continue;
  }
  await generate(id);
  await new Promise((resolve) => setTimeout(resolve, 8_000));
}
