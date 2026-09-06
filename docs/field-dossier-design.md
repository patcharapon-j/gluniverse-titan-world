# Field dossier design

The sheet is a Survey Corps personnel file: paper in a leather binder, filled in by
hand, stamped by a clerk. Reference: the user-supplied `fielddossierv2.html`, matched
closely and then taken further for play at the table.

## Preview

`npm run preview` renders every surface from the real templates and stylesheet against
a fabricated character and writes them to `preview/`. `npm run preview:serve` serves
that directory on <http://localhost:8123>. Pages accept `?zoom=1.6` and `?pan=400` for
close inspection. The harness never touches a Foundry world.

Surfaces covered: `overview`, `actions`, `wounds`, `gear`, `shifter`, `record`,
`party`, `titan`, `narrow` (660 px window), `item`, `dialog`, `chat`, and `states`
(the consciousness track at full health, wounded with a reduced maximum, and past zero).

## Tokens

| Role | Value |
| --- | --- |
| Paper | `#ece2cb`, highlight `#f4ecd8`, low `#e2d5b8` |
| Ink | `#241f1b`, secondary `#4f463d`, muted `#7a6f62` |
| Red (headings, stamps, alarm) | `#8e2323`, high `#a83030`, low `#5f1717` |
| Blue (shared luck, informational) | `#2f4a6e` |
| Brass / leather (window frame) | `#b9924a` / `#3a2618` |
| Severity | minor `#b0842f`, major `#8e2323`, crippling `#241f1b` |
| Statistic ink | Agility `#2b6b5c`, Technique `#2f4a6e`, Mind `#5c4a86`, Body `#8e2323`, Heart `#a3542c`, Duty `#6e5325` |

Each statistic owns an ink. A card, an action row, a filter chip and a line of the
modifier ledger all carry it through `--sc`, so a list can be read by colour before it
is read by word.

Three faces: **TW Display** (Playfair) for names and numerals, **TW Archive**
(Special Elite) for archival labels, **TW Serif** (Noto Serif) for prose. Body 12.5 px;
no archival label below 9 px, because typewriter digits stop being legible.

## Structure

- **Window** — leather with a brass stitch line and grain; the paper sits inside with
  fibre grain, foxing, one fold, a red double margin rule and three brass eyelets.
  Content clears the binding at 66 px on the left, 22 px on the right.
- **Header** — portrait with photo corners (an archive stamp when there is no
  photograph), kicker, editable name at 42 px, dotted-underline meta, state tags, and a
  right rail carrying consciousness as a large numeral, its pip track, the formula it
  came from, the death threshold, and a one-click damage/heal stepper.
- **Tabs** — file-folder tabs, numbered, each with its icon; the active one is lit by a
  red ink bar. Soldiers get six, mindless Titans three, the party actor none.
- **Panels** — every section opens with a `§n Title ————— hint [action]` rule.

## Components

- **Statistic card** — a key column carrying the effective value at 38 px over the
  editable `base` field, then the name, the description, and every applied modifier
  stamped with the reason it came from (`−1 L. Leg`, `−1 Extra Gas Canisters`). Two
  reasons show in full; the rest are counted and named in the Gear tab's ledger. Dodge
  fatigue is drawn as an outline, because it is spent at the roll rather than baked into
  the value. The whole card is a roll target; a `ROLL` stamp rotates in on hover.
- **Condition strip** — six regions across, tinted and pipped by worst standing wound,
  each carrying the penalty it is currently applying, each a shortcut into the injury log.
- **Consciousness track** — boxes, not a bar. Filled boxes are held, empty boxes are
  spent and recoverable, boxes struck through in red were taken by wounds and cannot be
  rested back, and dashed struck boxes have been removed from the maximum entirely by a
  negative adjustment. Below zero a second row counts the deficit, darkening at the death
  threshold.
- **Engagement** — the sighting roll leads as a full-width primary button, because fear
  interrupts everything else. Below it the fear state (Steady / Shaken / Frozen) sits
  beside the roll that sets it, and is set automatically from a Face fear result.
- **Action row** — a statistic tile in that statistic's ink carrying its three-letter
  name and the character's *current* effective modifier, then the action name, the 10+
  outcome (or its source section), and the difficulty and combat flags. Two columns,
  grouped by category and clustered by statistic within it, filtered by category chips,
  statistic chips and a search box. The tab opens with the same featured strip the
  overview carries, so the sighting roll is one click from anywhere.
- **Injury log** — one row per region whether or not it is wounded, carrying the penalty
  that region is applying right now, then every wound with severity, type, consciousness
  cost, treatment state, healed-from-major marking — and, written out, what that exact
  injury does to you, taken from the source section for its severity, type and location.
  Beside it, an anatomical figure with severity hatching, leader lines, and per-region
  penalty labels.
- **Field kit** — a requisition rack. Each line carries a kind-tinted icon chip, a
  supply gauge whose slots take the shape of the thing being counted (gas cylinders,
  blade slivers, flare shells, bandage rolls) with spent slots hatched through, the
  count, and a stepper. A depleted line is stamped SPENT across its gauge.
- **Melee reach** — Titan size answered as a ruler rather than a table. Every height
  the book lists, 3 m to 15 m, is drawn as a cell and painted against the band you can
  actually reach: green inside it, hatched amber where the Titan stands five metres or
  more over you and every roll turns difficult, hatched red where you are in reach but
  automatically fail for want of a Titan body or Body +2, grey outside it. Your own
  height is editable in the panel — `system.height` for a human or a mindless Titan,
  `system.shift.height` for a form, halved automatically for a weak one. Beneath the
  ruler, four lines state the band, the difficulty threshold, the decapitation kill and
  what happens out of reach, rewritten from the Titan's own side on a Titan sheet.
- **Titan bites** — a bite is one wound that deepens by count, so it is drawn as one
  track: fang-shaped boxes filled as bites land, with the major and crippling thresholds
  marked on the boxes that cross them and named underneath. The Armoured Titan halves
  the damage, which moves both thresholds rather than changing the reading.
- **Marked difficult** — a striped red banner between the tabs and the panel body, so it
  stays on screen whichever tab is open, carrying what the penalty does and a Clear
  button. The header tag becomes a solid stamp, quick actions take dashed red edges, and
  the hover ROLL stamp reads `ROLL · HARD`.
- **Controls** — steppers with `−`/`+` shoulders, stamped-ink checkboxes, paper fields
  with a rule that reddens on focus, ruled textareas, custom select carets. Buttons are
  paper with a hard offset shadow that presses in on click.
- **Chat card** — a hero band in leather carrying the roller's photograph, their name
  and the action with its source section; then the total at 56 px in the band colour
  beside real d6 faces and the modifier breakdown; then the **tier scale** — 6−, 7–9 and
  10+ side by side with the one reached filled and enlarged, and the middle segment
  struck out on a difficult roll. Snake eyes and double sixes add an overriding stamp.
  Below that, the action's own text for the tier reached, attributed (`Strike the nape ·
  10+`), and the full source section in a disclosure.

## Motion

140–180 ms hover tints and presses. Tab changes fade once. A changed live value flashes
brass for 520 ms. Nothing loops, and `prefers-reduced-motion` disables all of it.

## Data notes

`system.capacity` on gear records what a full load looks like, which is what drives the
field-kit pips (`2/6 blades`). Equipping a loadout sets it from the granted quantity.

`system.height` is the actor's own height in metres and drives the melee reach ruler;
`system.shift.height` is the Titan form's height for a shifter, and a weak form reads
as half of it. `system.bites` counts Titan bites taken, which the sheet resolves into a
single deepening cutting wound.

`system.fear` holds the standing fear state — `steady`, `shaken` or `frozen`. A Face
fear roll writes it: 10+ steadies, 7-9 shakes and also marks the next roll difficult,
6 or lower freezes. It can be set by hand from the Engagement panel.
