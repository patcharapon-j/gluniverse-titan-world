# Titan World 2.0 — UI/UX rework spec

Decisions settled with the user on 2026-09-11. Released as **2.0.0** in one go from
branch `ui-2.0-rework`; nothing is committed or released without the user's sign-off.

**Direction change (same day).** After seeing the ODM-industrial flavour boards the user
judged a completely new look a step too far. 2.0 is a **v2 of the field dossier**: the
same visual world (`field-dossier-design.md`) and recognisably the same sheet, made more
compact, better to use, more tactile and more satisfying. Layout may change where that
makes the sheet tighter or clearer; it must still read as the current sheet evolved.
The ODM prototype (`preview/ui2/`) is retired.

## Goals

1. **Compact first.** Sheets, dialogs and chat cards are currently too big: less dead
   space, smaller default windows, denser but still legible rows, shorter cards.
2. **Then tactile and satisfying:** physical treatments, direction-aware feedback, rich
   animation and impact moments.
3. Higher fidelity and polish throughout. No sound. Data paths, `data-action` names,
   `tw`-prefixed Handlebars helpers and Dice So Nice support stay; old chat-card markup
   need not stay compatible.

## Visual direction

- **Field dossier, evolved.** Paper in a leather binder, brass fittings, red ink, rubber
  stamps, typewriter labels, per-statistic inks, Playfair / Special Elite / Noto Serif.
  Existing tokens and statistic inks stay; refine rather than replace.
- Higher fidelity: crisper paper and leather, real stamp ink texture, better depth on
  pressable things (buttons press into the paper), consistent optical sizes.
- Physical objects belong to the dossier world: photographs with corners, stamps,
  paper tabs, brass eyelets and tokens, leather straps, string ties, paper clips,
  requisition slips, ink that bleeds.

## Scope

All system-owned surfaces: soldier/titan/party actor sheet, item sheet, every system
dialog, window chrome, roll card, party-luck request/approved/declined cards, plus new
cards below. Foundry core UI untouched. Localisation out of scope.

## Layout (v2 of the current structure)

- Keep: leather window, paper page, header (portrait, name, meta, tags, consciousness),
  numbered file tabs (Overview / Actions / Wounds / Gear / Shifter / Record; Titans get
  three), § section rules, Overview two-column with side boxes.
- Compact: smaller default window, narrower binder margin, shorter header (tags beside
  meta, smaller portrait and name), slimmer tabs and difficult bar, statistic cards
  without the always-on description, tighter condition strip, engagement and side boxes.
- Changes that improve use are allowed (merging or re-ordering boxes, moving controls
  next to what they change) as long as the sheet still reads as the same dossier.
- The other surfaces follow the same world:
  - **Actions:** a card file. Quick rolls first, then one condensed filter bar (search,
    statistic chips, category chips), then index cards filed by category and statistic.
    Each card's result ladder unfolds beneath it.
  - **Record:** a typed personnel card with the clerk's milestone stamps. Each statistic
    gets one growth mark that records or strikes out a GM-awarded advance directly.
  - **Gear:** the field kit first. Below it sit an issued-equipment ledger (Carried is a
    stamp, counts are drums) and stored loadouts as carbon requisition slips with an
    Unpack stamp.
  - **Shifter:** one riveted form control plate (lever, form, term, bites) above the
    inherited powers as sealed cards.
  - **Wounds:** coma and KIA plates close the figure. The injury log is denser, with one
    stamped type × severity mark per wound.
  - **Titan:** the Overview side column is an iron rail: specimen (height, nape, reach),
    bites, then hide and regrowth.
  - **Party:** the brass pool and a GM strip, beside a squad board of every visible soldier.
  - **Item sheet:** a compact item slip, 560 × 640. Its header shows the object itself: the
    kit object for gear, the wound on a small figure, otherwise the photograph.

## Rolling

- The dialog opens on **every** roll (no fast-forward), redesigned compact: six
  statistic keys in their inks showing the live value, 0–3 advantage segments,
  modifier stepper (wheel works), Difficult / Combat stamped toggles, compact 4-way
  visibility, live formula line, big press-in ROLL button, Enter rolls, focus on ROLL.
- Only visibility persists between rolls.

## Dialogs

- Every system dialog is a compact firing panel in the roll dialog's style. Choices are
  slips, chips, statistic keys, icon segments, steppers and stamped options, not form fields.
- Stat packages and loadouts are requisition slips; the chosen one lifts and is stamped.
  To assign six stats you pick value chips while a live tally counts down; Apply stays
  disabled until the package is placed exactly.
- Injuries are picked off a body map, then severity and type segments. Treatment options
  the wound's rules exclude stay visible and say why.
- GM consequence, consciousness (a stepper with a preview of the track), rest, shift,
  party-luck tokens and advancement use the same panel.
- A yes/no question is a small slip already stamped for signature. Every dialog lands
  like a slip put down on the table.

## Chat cards

- Roll card roughly half its current height: slim hero (small photo, name, action),
  total + dice + tier on one row, slim tier scale, outcome text, compact action row
  (Luck / Reroll / GM consequence, only for permitted users), one disclosure for the
  ladder and source rules.
- Reveal ≈900ms (crit/fumble ≤1.3s): card slides in → dice land staggered → total counts
  up → tier fills → tier stamp thumps. Double six: gold burst + shake. Snake eyes: red
  ink crack + shudder. Live messages only; waits for Dice So Nice; luck/reroll updates
  animate only what changed.
- Without Dice So Nice: 2D dice with anime.js bounces (no in-card 3D dice).
- New cards: **flare**, **wound report**, **death**, **Titan transformation**, each
  carrying its effect to every client.
- **Party luck** is a brass-token card. It shows who asked, for which roll, and the pool.
  The GM's Approve / Decline is stamped across the same card, and that change plays once
  on clients connected when it happens.

## Tactility

- Trackers: click a box to set to that point (click the top filled box = −1), wheel on
  steppers, ± kept. Direction-aware feedback: loss = red jolt, restore = cool pulse,
  numbers count.
- Dossier-world treatments: consciousness boxes inked in / struck through with a pen
  stroke; luck as brass tokens that flip bright → tarnished; bites punched through a
  leather strap; fatigue as a strap notch; fear as a stamped three-way selector (Frozen
  frosts it); years remaining as a tally scored out; loadouts as a requisition slip that
  unpacks; Carried as a stamp you press; growth marks you click to record an advance.

## Kit (consumables)

- Physical kit in the Field kit box and Gear tab: blades, gas canisters, flares,
  magazines, bandages, rations drawn as real objects resting in the file, spent by drag
  or click, restored by clicking the empty slot, refill per container + "Resupply all".
- Object mapping by item key, name fallback, generic pouch; homebrew override via an
  item-sheet select (`system.category`). Slots = max(capacity, quantity) with physical
  caps, then a count badge. Plain numbers stay on the item sheet.
- Blades and gas canisters as three.js objects (validated in the showpiece stage;
  fall back to drawn SVG). Firing a flare posts the flare card.

## Wounds

- Anatomical front-view figure on the Wounds tab, correct L/R, drawn on the paper;
  wounds soak into it visually. Per-viewer **Gore** Graphic (default) / Restrained /
  Clinical; GM sets the default.
- Per type × severity visuals (bruise → crushed limb; slash → severed; entry hole →
  destroyed; scorch → char), layered per region (cap 4), healed → scar, untreated majors
  drip, treated → bandage/splint; crippling blunt/burn limbs treat as amputation.
- Wound lands: window jolt, red vignette, blood spatter on the paper, consciousness
  drains; wound report card. Death: KIA stamp across the photograph, mourning band,
  monochrome except blood; death card. Coma derived. Titan figure steams; bites arc
  around the nape; armour plates while intact.
- Treatment winds gauze over the wound. Healing washes it out to a stitched scar, and Titan
  flesh steams and regrows. The Armoured Titan's plates shatter when its armour breaks.
- Fix hatch-pattern ID collisions (per-sheet IDs).

## Motion and effects

- **anime.js 4.5.0** for choreographed sequences; CSS for hover/press.
- **three.js r184** vendored minified (MIT, addon imports rewritten, no build step),
  lazy-loaded; one shared full-screen transparent WebGL layer above sheets and chat,
  below Dice So Nice and notifications, `pointer-events:none`.
- Effects: double-six sparks, snake-eyes crack, tier-stamp shockwave, flare streak,
  wound spatter, death ash, blade-draw glint, gas puff, titan steam, transformation
  lightning. Loops only for the near-death pulse and untreated-major drip.
- Per-user settings: **Motion** Full / Subtle / Off; **GPU effects** Auto / On / Off;
  **Gore**. OS reduced-motion deliberately ignored. Every effect has a non-WebGL fallback.

## Process

Worked directly in the real templates and stylesheet, judged in the preview harness,
one stage at a time with screenshots for the user. **Stages 1–4 are implemented** on
`ui-2.0-rework`.

1. **Compact + polish:** window, header, tabs, difficult bar, Overview, roll dialog,
   roll card. Before/after shots. *Implemented.*
2. **Tactile + motion:** vendored anime.js, tracker interactions and feedback, roll
   reveal, settings. *Implemented.*
3. **Showpieces:** physical kit, visceral wounds, WebGL effects, new cards. *Implemented.*
4. **Remaining surfaces:** Actions, Gear, Shifter, Record, party, titan, item sheet,
   other dialogs and cards; rewrite `field-dossier-design.md` and `ui-integration.md`;
   update harness and tests. *Implemented.*

**What remains:** user testing against the definition of done below, then the user's
sign-off and the 2.0.0 release.

## Definition of done

`npm test` and `npm run check` pass; verified in the preview harness and the live
`titan-world` world as `gamemaster` (blank password) with Dice So Nice on and off,
covering soldier/titan/party/item sheets, every dialog, every card type, all motion
settings and gore levels; screenshots sent; user signs off before 2.0.0.
