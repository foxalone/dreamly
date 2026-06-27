# Dreamly Dream Dictionary — Cluster & SEO Structure Audit

Source analyzed: `lib/dream-dictionary.ts` (single source of truth for the dictionary; pages are generated from this file). Snapshot as of June 27, 2026.

Totals: 15 parent symbols, 83 variation pages, 98 total dream pages, across 8 categories.

Note on "SEO Strength": this dataset has no analytics/Search Console data attached, so strength is a heuristic based on variation depth, cross-link density, and how commonly the topic is searched as a dream-dictionary query in general (not live keyword volume). Treat it as directional, not measured.

---

## Step 2: Cluster-by-Cluster Map

**Snake** (animals)
- Variations (7): Black Snake, White Snake, Green Snake, Snake Bite, Dead Snake, Many Snakes, Big Snake
- Related: Water, Death, Dog, Spider
- SEO Strength: High

**Teeth** (body)
- Variations (6): Teeth Falling Out, Broken Teeth, Loose Teeth, Pulling Teeth, Rotten Teeth, Losing Teeth
- Related: Death, Falling, Money, Baby
- SEO Strength: High

**Water** (water)
- Variations (7): Flood, Ocean, River, Drowning, Dirty Water, Clear Water, Rain
- Related: Flying, Death, Baby, House
- SEO Strength: High

**Death** (life-events)
- Variations (6): Someone Dying, A Dead Person, A Funeral, Being Killed, Killing Someone, A Dead Relative
- Related: Baby, Snake, Water, Falling
- SEO Strength: High

**Baby** (life-events)
- Variations (6): Newborn Baby, Crying Baby, Baby Boy, Baby Girl, Holding a Baby, Lost Baby
- Related: Pregnancy, Water, Death, Dog
- SEO Strength: High

**Pregnancy** (life-events)
- Variations (5): Being Pregnant, A Pregnancy Test, Giving Birth, Miscarriage, A Pregnant Woman
- Related: Baby, Water, Death, House
- SEO Strength: Medium

**Dog** (animals)
- Variations (6): Black Dog, White Dog, Dog Bite, Friendly Dog, Aggressive Dog, Dead Dog
- Related: Cat, Snake, Baby, Spider
- SEO Strength: Medium

**Cat** (animals)
- Variations (5): Black Cat, White Cat, Cat Attack, Kittens, Dead Cat
- Related: Dog, Snake, Spider, House
- SEO Strength: Medium

**Flying** (movement)
- Variations (4): Flying High, Flying Over Water, Flying Without Wings, Falling While Flying
- Related: Falling, Water, Car, Being Chased
- SEO Strength: High

**Falling** (fear-nightmares)
- Variations (4): Falling From a Height, Falling Off a Building, Falling Into Water, Falling and Waking Up
- Related: Flying, Being Chased, Death, Water
- SEO Strength: High

**Being Chased** (fear-nightmares)
- Variations (4): Being Chased by a Man, Being Chased by an Animal, Being Chased by a Monster, Hiding From Someone
- Related: Falling, Death, Dog, Snake
- SEO Strength: High

**House** (places)
- Variations (6): Old House, New House, Burning House, Empty House, Childhood House, Haunted House
- Related: Baby, Pregnancy, Money, Death
- SEO Strength: Medium

**Money** (objects)
- Variations (6): Finding Money, Losing Money, Coins, Gold, Wallet, Stealing Money
- Related: House, Car, Gold, Teeth
- SEO Strength: Medium-High

**Spider** (animals)
- Variations (5): Big Spider, Black Spider, Spider Bite, Killing a Spider, Spider Web
- Related: Snake, Cat, Dog, House
- SEO Strength: Medium-High

**Car** (movement)
- Variations (6): Car Accident, Driving a Car, Losing a Car, Stolen Car, Car Crash, Brake Failure
- Related: Flying, Falling, Money, House
- SEO Strength: Medium

---

## Category Coverage

| Category | Parent Symbols | Notes |
|---|---|---|
| Animals | 4 (Snake, Dog, Cat, Spider) | Best-developed category |
| Life-events | 3 (Death, Baby, Pregnancy) | Well-developed, tightly linked |
| Movement | 2 (Flying, Car) | Solid but room to grow |
| Fear & Nightmares | 2 (Falling, Being Chased) | Solid but room to grow |
| Body | 1 (Teeth) | Single-symbol category — underdeveloped |
| Water | 1 (Water) | Single-symbol category — underdeveloped |
| Places | 1 (House) | Single-symbol category — underdeveloped |
| Objects | 1 (Money) | Single-symbol category — underdeveloped |

Four of the eight categories rest on exactly one parent symbol. That's not broken, but it means most of the site's category-level internal linking and topical depth is concentrated in Animals and Life-events.

---

## Step 3: Missing Relationships and Gaps

**One-directional cross-links (link exists one way but isn't reciprocated):**

- Snake → Water, but Water does not link back to Snake
- Teeth → Death, Falling, Baby, but none of those link back to Teeth
- Pregnancy → Water and → Death, but neither links back to Pregnancy
- Cat → Snake and → House, but neither links back to Cat
- Flying → Being Chased, but Being Chased doesn't link back
- Being Chased → Death, Dog, Snake, but none of those link back to Being Chased
- House → Baby and → Death, but neither links back to House
- Spider → House, but House doesn't link back to Spider
- Car → Falling and → House, but neither links back to Car

This is the largest structural issue in the dataset: roughly half of all `relatedSymbols` links are one-way. For internal linking and crawl equity, related-symbol links should generally be symmetric (if Snake links to Water, Water should link to Snake) unless the asymmetry is intentional.

**Self-referencing link (data bug, not a content gap):** the Money cluster's `relatedSymbols` is `["house", "car", "gold", "teeth"]`, and "Gold" is also one of Money's own variation slugs. Because variation pages inherit the parent cluster's `relatedSymbols` verbatim, the **Gold** page currently links to itself as a "related symbol." Worth fixing independent of any SEO work.

**Isolated/under-linked categories:**
- Body, Water, Places, and Objects each have only one parent symbol, so there's no sibling symbol within the category to cross-link to. Their only inter-symbol links go to other categories.

**Underdeveloped categories (by parent-symbol count):** Body, Water, Places, Objects (1 parent each) — these are the categories most likely to feel thin to both users and search engines navigating by category.

**Notable absence:** no parent symbol currently exists for some very common dream-dictionary evergreens that would naturally fit existing categories (e.g., nothing in Places besides House; nothing in Objects besides Money). Flagging this as a structural gap only — not proposing new symbols per your instruction.

**Variation-level gaps inside existing clusters** (commonly searched sub-topics not currently represented as their own variation page):
- Snake: snake in the house, snake attacking, two snakes, yellow/colored snake variants beyond black/white/green
- Teeth: teeth crumbling, front tooth breaking, shark teeth
- Water: tsunami/big wave, swimming, boiling water
- Death: dreaming of your own death, death of a pet
- Baby: sick baby, twins
- Pregnancy: pregnant with twins, someone else announcing pregnancy
- Dog: dog attack, stray dog, puppy specifically
- Cat: multiple cats, cat scratching you
- Flying: flying in a plane (vs. unaided flight), losing the ability to fly mid-dream
- Falling: falling down stairs
- House: stranger inside the house, moving out
- Money: winning the lottery, counterfeit money, borrowing/owing money
- Spider: spider infestation, spider crawling on body
- Car: car breaking down, flat tire

These are listed as gaps for awareness only, per your instruction not to generate new symbol pages yet.

---

## Step 4: Cluster Ranking by SEO Opportunity

| Cluster | Pages (parent+variations) | SEO Potential | Missing Variations (gap count) |
|---|---|---|---|
| Snake | 8 | High | 4 |
| Water | 8 | High | 3 |
| Teeth | 7 | High | 3 |
| Death | 7 | High | 2 |
| Baby | 7 | High | 2 |
| Money | 7 | Medium-High | 3 |
| House | 7 | Medium | 2 |
| Car | 7 | Medium | 2 |
| Dog | 7 | Medium | 3 |
| Spider | 6 | Medium-High | 2 |
| Pregnancy | 6 | Medium | 2 |
| Cat | 6 | Medium | 2 |
| Flying | 5 | High | 2 |
| Falling | 5 | High | 1 |
| Being Chased | 5 | High | 0 (well-covered, but poorly cross-linked) |

Reading the table: "High potential, fewer pages" (Flying, Falling, Being Chased) are the most efficient places to add 2–3 more variation pages — strong topical demand, currently thinner than Snake/Water/Teeth. "Medium potential, already 6–7 pages" (Dog, Cat, House, Car, Pregnancy) are reasonably saturated for their topical ceiling; further investment there has lower marginal return than fixing their cross-linking.

---

## Step 5: Summary

- Total parent symbols: 15
- Total variation pages: 83
- Total dream pages: 98
- Categories: 8, of which 4 (Body, Water, Places, Objects) have only a single parent symbol
- Largest clusters by page count: Snake (8), Water (8), Teeth (7), Death (7), Baby (7), Money (7), House (7), Car (7), Dog (7)
- Weakest clusters by page count: Flying, Falling, Being Chased, Spider, Pregnancy, Cat (4–6 pages each)
- Most valuable clusters for near-term expansion: Flying, Falling, and Being Chased — high assumed search interest, currently the thinnest variation counts, and (for Being Chased especially) a cross-linking gap that costs it internal authority today
- Highest-priority non-content fix: resolve the ~9 one-directional related-symbol links and the Money→Gold self-reference, since these affect every existing page's internal linking, not just future ones

No new symbols were proposed in this audit, as instructed — this is strictly a map of what currently exists and where it's structurally thin.
