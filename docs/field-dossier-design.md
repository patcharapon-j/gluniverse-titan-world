# Field dossier design · version 2

The sheet is a Survey Corps personnel file: paper in a leather binder, filled in by hand,
stamped by a clerk — and, since 2.0, a file you can handle. Blades pull out of the rig,
brass tokens flip, a strap tightens a notch, wounds soak into the drawing. Version 2 keeps
the world and the structure of the first dossier, makes it about a third more compact, and
adds physical interaction and motion. Decisions are recorded in `ui-2.0-spec.md`.

## Preview

`npm run preview` renders every surface from the real templates and stylesheet against a
fabricated character and writes them to `preview/`; `npm run preview:serve` serves the
system root on <http://localhost:8123> (open `/preview/<page>.html`). The harness never
touches a Foundry world, but the pages load the real browser modules, so the 3D rig,
drag-out and wheel steppers work there too. Pages accept `?zoom=1.6` and `?pan=400`.

| Page | What it shows |
| --- | --- |
| `pages` | An index of every page below |
| `overview`, `actions`, `wounds`, `gear`, `shifter`, `shifter-open`, `record` | Each tab of the soldier sheet at the default 860 × 760 |
| `actions-combat` | The card file filtered to Combat, dealt in on load, with one result ladder open |
| `wounds-coma`, `wounds-kia` | The coma and killed-in-action plates over the figure |
| `narrow` | The 660 px layout |
| `titan`, `titan-armoured`, `titan-killed` | The Titan's iron rail; the Armoured Titan with its plating broken; a killed Titan |
| `party`, `states` | The squad board and GM strip; consciousness states |
| `item`, `item-consumable`, `item-wound`, `item-loadout`, `item-plain` | The 560 × 640 item slip with each kind of object-art header |
| `dialog`, `dialogs` | The roll dialog; every other system dialog, in its window class and width, including the confirm slip |
| `chat` | Roll cards at sidebar width, plus the flare, injury, death, transformation and party-luck cards |
| `figures` | Every wound treatment on both bodies at Graphic, Restrained and Clinical, with the mini figure |
| `lab` | The live sheet, cards and effects behind buttons: tracker changes, a wound landing, death, transformation, each roll reveal, every WebGL effect, and the Motion and GPU settings |

## Tokens

| Role | Value |
| --- | --- |
| Paper | `#ece2cb`, highlight `#f4ecd8`, low `#e2d5b8`, deep `#d6c6a4` |
| Ink | `#241f1b`, secondary `#4f463d`, muted `#7a6f62` |
| Red (headings, stamps, alarm) | `#8e2323`, high `#a83030`, low `#5f1717` |
| Blue (shared luck, success) | `#2f4a6e` |
| Brass / leather | `#b9924a` / `#3a2618`; straps `#6d4c34 → #4a3122` |
| Canvas (bag, pockets) | `#8b7b59 → #675839`, pocket `#7a6a4a → #62543a` |
| Severity | minor `#b0842f`, major `#8e2323`, crippling `#241f1b` |
| Statistic ink | Agility `#2b6b5c`, Technique `#2f4a6e`, Mind `#5c4a86`, Body `#8e2323`, Heart `#a3542c`, Duty `#6e5325` |
| Blood | fresh `#7e0f0f`, dark `#4a0505`, pooled `#560707` |

Three faces: **TW Display** (Playfair) for names and numerals, **TW Archive** (Special Elite)
for archival labels, **TW Serif** (Noto Serif) for prose. Body 12 px; archival labels no
smaller than 7.5 px and only in uppercase tracked runs.

## Structure

- **Window** — leather with a brass stitch line; paper inside with grain, foxing, one fold, a
  red double margin at 28 px and three brass eyelets. Content clears the binding at 40 px
  (30 px below 760 px wide, 14 px below 600 px). Default size 860 × 760.
- **Header** (~95 px) — photograph with corners, kicker, name at 28 px, meta, state tags, and a
  consciousness column: the numeral at 38 px, a vertical stepper, the box track, the formula.
  A Titan shows its nape status there instead.
- **Tabs** — numbered file tabs; closed ones a shade deeper, the open one joins the page with a
  red top edge.
- **Difficult bar** — one line, full rule on hover.
- **Panels** — every section opens with a `§n Title ——— hint [action]` rule; hints are hidden
  inside the narrow side boxes.
- **Item sheet** — a compact item slip, 560 × 640. The header shows the thing itself: the kit
  object in its pocket, the wound on a small figure, or the photograph. When an object is drawn,
  the photograph shrinks to a print clipped to its corner. Below: tight two-column particulars,
  then the flags as stamped chips.

## Components

- **Statistic card** — value at 30 px over the base field, the name and the reasons stamped on it;
  the description is the card's tooltip. The whole card rolls; a `ROLL` stamp turns in on hover.
- **Condition** — the mini body figure beside six region cards (3 × 2). Either opens the wound log.
- **Consciousness track** — boxes you press: click one to set the track to it, click the top held box
  to lose one. Loss jolts the column and knocks the struck boxes; recovery pops them back in.
- **Dodge fatigue** — a leather strap with brass eyelets; the buckle sits in the notch it is pulled
  to. Click a notch to set, the wheel steps it.
- **Shared luck** — brass tokens, bright while spendable and tarnished once spent; they spin when the
  pool changes. On the party sheet the GM sets the pool by clicking a token.
- **Fear** — the stamped three-way selector; Frozen frosts the bar over.
- **Field kit (overview)** — one row per consumable: its name, its objects, its count. Click an object
  to use it, click an empty slot to restock, or drag the object out.
- **Field kit (Gear tab)** — the spread. The ODM rig is a three.js scene on its leather: two scabbard
  boxes with blades running out of them and gas canisters clamped on top, stacked when the panel is
  tall and mirrored when it is wide. Hover tilts it; click or pull a blade and it slides free, glints
  and lifts away; a canister unscrews and vents. The bag beside it is a satchel, full backpack or belt
  pouch with a pocket per consumable, a label tape, a count and a brass *Refill* tab; *Resupply all*
  restocks everything to capacity. With GPU effects off the rig is drawn with the same SVG objects.
- **Equipment ledger (Gear tab)** — numbered lines under the kit. *Carried* is stamped in blue ink,
  and a stowed line leaves the box empty but for a pencilled word. Each line shows the article with its
  kit glyph and modifier, and its count on a paper drum between two keys; the wheel turns the drum.
- **Requisition slips** — a stored loadout is a carbon slip torn off the quartermaster's pad: form
  number, manifest, the additions it offers, and a red *Unpack* stamp that unpacks it into the kit.
  On the loadout's own sheet the slip lies flat and lists every article.
- **Card file (Actions tab)** — quick rolls on top, then one filter bar: search with a live tally,
  statistic chips priced against the character, category chips. Every action is an index card filed
  under its category and statistic. The card shows a rubber-stamped statistic tile with the live
  modifier, the name and source, and *D* / *C* flags. Click the card to roll; the caret in its corner
  unfolds the result ladder as a slip tucked beneath it.
- **Service record (Record tab)** — a typed personnel card (regiment, rank, origin, height) with the
  clerk's milestone stamps beside it: enlisted, promoted, advanced ×n, fully advanced, experienced
  shifter. Each stamp leans its own way.
- **Growth record** — one mark per statistic. Click an open mark to record a GM-awarded advance, or an
  inked one to strike it back out; each asks first. A statistic already at +3 shows the ceiling.
- **Body diagram** — a uniformed soldier drawn front-on in ink and wash (the character's right on the
  viewer's left), or a grinning Titan with its nape marked. Every wound is painted where it landed:
  bruises, gashes with running blood, entry holes, scorched and burnt-through cloth, crushed and
  charred limbs, severed stumps with a pool beneath, bandages, splints, dressed stumps, scars. Untreated
  majors drip. Labels appear only where something happened. Gore is per viewer: Graphic, Restrained
  (less blood, no pools or bone) or Clinical (severity hatching and a type glyph, lost limbs dashed).
  Titans show bite arcs deepening toward the thresholds, armour plates while intact, steam over wounds,
  and lose the head to a crippling head wound.
- **Injury log** — one row per region. Each wound carries a single stamped mark, the type's glyph on
  the severity's ink notched one to three, then its tags and *Treat* (inked) or *Amputate* (stamped red).
  A coma or KIA plate, in the header stamp's ink, closes the figure panel.
- **Death** — the photograph greys, a mourning band crosses it, a KIA stamp lands, the name is struck
  through, the track goes black; the page ashes out once as it happens.
- **Titan bites** — fang holes punched through a leather strap; thresholds dyed into it.
- **Titan rail** — a Titan's Overview side column, kept on iron. It holds the specimen (height, nape,
  the reach ruler and its rulings), the bite strap, then hide and regrowth. Armour plating is a riveted
  steel plate that is itself the checkbox and cracks when it gives. Open wounds are counted by how fast
  they close, under hanging vapour.
- **Form control plate (Shifter tab)** — one riveted iron plate holding four things. The pull lever
  sits down when transformed, with the powers it will use beside it. Next are form height and flags,
  then the thirteen-year term as tally marks engraved on brass and scored out as years pass, with
  absorption. Last is the bite strap.
- **Inherited powers** — each power on file is a dossier entry closed under red wax, carrying the rule
  it grants. Break the seal to use it while transformed; it then wears a brass seal and the clerk's
  *In use* stamp.
- **Party sheet** — the brass pool and the clerk's strip (spend, restore, mission maximum, next
  mission) sit beside a squad board. The board has one pinned card per visible soldier: photograph,
  consciousness boxes, fatigue notches, standing wounds. The fallen grey out, take a mourning band and
  a KIA stamp. A card opens that dossier.
- **Roll dialog** — a firing panel: six statistic keys in their inks with live values, advantage
  segments, a modifier stepper, stamped Difficult and Combat toggles, four visibility segments, a live
  formula and a big Roll button.
- **Other dialogs** — the same firing panel:
  - stat packages and loadouts as requisition slips stamped *Filed* or *Issued*
  - six-stat assignment as value chips over a token tally that reads *Balanced* when every value is placed
  - a body map with severity and type segments
  - treatment tickets that say why a rule excludes them
  - consequences as icon segments
  - a consciousness stepper that previews the track
  - rest as stamped results
  - party luck as brass tokens
  - advancement as statistic keys reading current › next

  A confirmation is a small slip already stamped for your signature. Every dialog lands like a slip
  of paper put down on the table.
- **Roll card** — slim hero, total with the dice, the tier scale, the outcome text, a compact action
  row, one fold-out for every result and the source rules.
- **Event cards** — a flare fired (the cartridge and its colour), an injury report (a small figure of
  the wound), killed in action, a Titan transformation.
- **Luck cards** — a brass token, who asked, for which roll, what kind, and the pool as tokens. The GM
  answers from the card, and *Approved* or *Declined* is stamped across it; after an approval the token
  just spent sits tarnished at the edge.

## Motion

Per-user settings: **Motion** Full / Subtle / Off, **GPU effects** Auto / On / Off (Auto falls back
when frames drop), **Gore** Graphic / Restrained / Clinical / World default. The OS reduced-motion
preference is deliberately not read.

- Roll reveal (~900 ms): the card slides in, the dice land with a bounce, the total counts up, the tier
  stamps with a shockwave, the outcome follows. Double six adds a gold flash, sparks and a shake; snake
  eyes an ink crack, a shudder and embers. It waits for Dice So Nice and plays only for new messages.
  A luck spend re-tallies only the total and the tier.
- Flare cards send a streak up the screen that bursts in the flare's colour; injury cards spatter;
  death cards ash; transformation cards strike lightning and steam. A luck request's token spins onto
  the desk. Approval flips it, turns the spent token and stamps the card; a refusal stamps and knocks it.
- A wound landing on an open sheet jolts the window, darkens the edges red, spatters from the region and
  leaves a blot on the paper that dries away. A transformation flashes and steams; a restock drops the
  objects back into their slots.
- First aid winds gauze over the wound, draws its folds and lets the stain seep back through. Healing
  washes the colour out and scores and stitches a scar; a Titan's severed limb pushes back out in steam.
  When the Armoured Titan's plating gives, the window takes a hard knock and the plates burst and fall
  back cracked, throwing iron shards off the page.
- Dialogs land like a slip. A chosen slip or stamped option kicks up dust; the stat tally stamps in
  when balanced and jolts when it stops being so; luck tokens flip.
- The card file slides surviving cards into the gaps as you search, and re-deals them when a filter
  chip changes. A roll presses its card into the drawer and thumps a *Rolled* stamp on it; a ladder
  unfolds rung by rung. A recorded advance stamps its growth mark in, a struck one is knocked, and new
  milestone stamps land.
- Loops: only the near-death consciousness pulse and the untreated-major drip. Subtle removes both.

## Data notes

`system.capacity` on gear is what a full load looks like: it sets the slots in the rig and bag, and
*Refill* restores to it. `system.category` on gear chooses the kit object (`''` matches by key and
name, `none` keeps it out of the kit). Amputation is derived, never stored: a crippling cut takes the
limb at once; a crippling blunt or burn limb goes when it is treated, which the sheet labels
*Amputate*. Titan flesh regrows when the wound heals; a soldier's stump stays.

`system.height`, `system.shift.height`, `system.bites` and `system.fear` behave as in version 1:
reach ruler, bite track, and the fear state written by a Face fear roll. A growth mark writes the
same `system.stats.*` and `system.advanced.*` the advancement dialog does.
