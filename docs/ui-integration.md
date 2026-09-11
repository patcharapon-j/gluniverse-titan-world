# UI integration contract

The approved look is the field dossier, version 2 (`field-dossier-design.md`); the
decision record for 2.0 is `ui-2.0-spec.md`. Change either only with the user.

## Files

- `styles/titan-world.css`: every style, scoped with `.tw` (plus `body.tw-motion-*` and
  `body.tw-gore-*` switches and the page-level effect layers).
- `templates/actor.hbs`, `templates/item.hbs`: one Handlebars root element inside the
  ApplicationV2 form. Partials are `templates/dossier-*.hbs`; `dossier-kit-slots.hbs` is
  shared by the overview rack, the rig, the bag and the item-sheet header.
- `lib/anime/anime.esm.min.js` (anime.js 4.5.0) and `lib/three/three.module.min.js` +
  `three.core.min.js` (three.js r184), vendored with their MIT licences. No build step;
  `scripts/package-release.py` ships `lib/`.

## Preserve

- `system.json` system ID `gluniverse-titan-world` and v14-only compatibility.
- `foundry.abstract.TypeDataModel` schemas in `module/models.mjs`. 2.0 adds no fields: the
  kit object override lives in the existing gear `system.category` (`''` automatic, `none`,
  or a key of `KIT` in `kit.mjs`).
- `ActorSheetV2` / `ItemSheetV2` with `HandlebarsApplicationMixin`, `form.submitOnChange`, and
  inherited document submission and ownership checks. Default sizes: actor 860 × 760, item 560 × 640.
- Six base stat paths `system.stats.*`. Display effective values from `actor.tw.stats`; never
  write derived penalties into base stats. A growth mark (`markAdvance`) and the advancement dialog
  both raise `system.stats.<stat>` by one and set `system.advanced.<stat>`; striking a mark out
  reverses both.
- Human loss `system.consciousness.loss`; Titan loss `system.consciousness.titanLoss`, each with
  its own maximum adjustment. Clicking a consciousness box adjusts the loss path, never the maximum.
- Wound Items and `system.formScope`. Each wound stores its own loss, treatment and healed-from-major
  marker. The body diagram reads amputation from wound state only (a crippling cut, or a treated
  crippling blunt or burn limb); nothing extra is stored.
- `system.shift.*`, party `system.luck.value` / `.max`, `system.bites`, `system.fatigue`,
  `system.fear`, `system.dead`, `system.nextDifficult`.
- Actor-owned Item drag data and UUIDs; owned move macros resolve the Item UUID.
- Chat uses v14 `messageMode` values `public`, `gm`, `blind`, `self`; the hook is
  `renderChatMessageHTML` with native HTML elements. The roll dialog writes the chosen
  visibility back to `core.messageMode`, so it carries to the next roll.
- Roll card markup that tests and Dice So Nice rely on: `section.tw.chat-card.{hit|mix|miss}`
  with `data-total` and `data-result`, `div.total`, and `i.t.{band}.on` in the tier scale.
  DsN hides `.tw.chat-card` while dice animate.
- A luck request is a GM-whispered message flagged `luckRequest` (`source`, `kind`, `revision`).
  Approval or refusal sets `resolved` and replaces that message's content in place with the
  approved or declined card.
- The authored result fields on every move and `RESULT_TIERS` / `moveOutcomes()` as the single
  source of tier labels. A roll card keeps printing the tier that landed and the full ladder.

## Behavioural modules

| Module | Responsibility | Loads in |
| --- | --- | --- |
| `rules.mjs` | Pure result classification, modifiers, injury derivation, starting arrays | Foundry, tests, harness |
| `models.mjs` | Persisted Actor and Item schemas | Foundry |
| `ui.mjs` | System ID, escaping, `prompt()` and the stamped `confirm()`, owner and GM guards | Foundry, tests, harness |
| `dossier.mjs` | Sheet view models: stat cards, injury ledger, tracks, notches, tally, action cards, `growthRecord`, `gearRow`, `requisitionSlip`, `powerCard`, `shiftPlate`, party `unitCard`, `SHEET_TABS`, `QUICK_ACTIONS` | Foundry, tests, harness |
| `kit.mjs` | Which kit object an item is, its slots, rig or bag | Foundry, tests, harness |
| `kit-art.mjs` | SVG sprite of drawn kit objects | Foundry, harness |
| `figure.mjs` | Body diagram markup for every wound, both bodies, all gore levels | Foundry, tests, harness |
| `roll-dialog.mjs` | Roll dialog markup and its formula behaviour | Foundry, tests, harness |
| `dialogs.mjs` | Every other dialog's markup builders and `wireDialog` | Foundry, tests, harness |
| `rolls.mjs` | Rolls, roll cards, luck requests, GM approval queue | Foundry, tests, harness |
| `cards.mjs` | Flare, injury report, death and transformation cards; `luckRequestCard`, `luckApprovedCard`, `luckDeclinedCard` | Foundry, tests, harness |
| `actions.mjs` | Creation, loadouts, advancement, injuries, treatment, transformation, consequences; opens each dialog through `panel()` | Foundry |
| `sheets.mjs` | Presentation context, `data-action` bindings, the document hooks that queue impacts | Foundry |
| `settings.mjs` | Motion, GPU effects and Gore settings; body classes | Foundry, harness |
| `fx.mjs` | anime.js helpers (`jolt`, `pulse`, `stamp`, `dialogIntro`…), page-layer fallbacks, `effect()` | Browser only |
| `fx-layer.mjs` | The shared full-screen WebGL particle layer; loads three.js lazily | Browser only |
| `kit-3d.mjs` | The 3D rig, painted by one offscreen renderer | Browser only |
| `sheet-fx.mjs` | Live value feedback, wheel steppers, drag-out, rig mounting, impacts | Browser only |
| `actions-fx.mjs` | Actions and Record tab motion: `wireActions` (search, re-deal, ladders, growth marks), `pressRoll` | Browser only |
| `chat-fx.mjs` | Roll card reveal, DsN wait, luck re-tally, event and luck card effects | Browser only |
| `main.mjs` | Foundry registration, settings, macros | Foundry |
| `data/content.mjs` | Generated source-backed runtime catalogue | Foundry, tests, harness |

"Browser only" modules import anime.js or three.js and must never be statically imported by a
module the tests or the node harness load. `ui.mjs` (`prompt`, `confirm`) and `dialogs.mjs`
(`wireDialog`) therefore reach `fx.mjs` only through dynamic imports inside browser callbacks.
`sheets.mjs` imports `sheet-fx.mjs` and `actions-fx.mjs` directly, because only Foundry loads it.

## Dialogs

- Every system dialog goes through `prompt(title, content, label, {classes, width, render})`, a
  `DialogV2.wait` whose content sits in `.tw-dialog` and whose Apply returns the form data. Every
  prompt plays `dialogIntro`; `confirm()` is the stamped `tw-confirm` slip and plays it too.
- The roll dialog is `rollDialogContent` + `wireRollDialog`. Every other dialog's content is a pure
  string builder in `dialogs.mjs`:
  - `packageContent`, `assignContent`: the stat package and the six-stat assignment
  - `loadoutContent`, `loadoutChoiceContent`: loadouts and their additions
  - `advanceContent`, `woundContent`, `treatContent`, `consequenceContent`
  - `consciousnessContent`, `restContent`, `shiftContent`, `partyLuckContent`

  The tests build exactly what Foundry shows.
- `actions.mjs` opens them with `panel(classes, width)`, which runs `wireDialog` on render.
  `wireDialog` wires a form once (`data-tw-wired`) and keys each behaviour off the markup:
  - `.dl-step`: steppers, ± and the wheel
  - `.lk-panel`: luck tokens
  - `.cs-panel`: the consciousness preview
  - `.cq-kinds`: the consequence line
  - `.as-panel`: the six-stat assignment, which keeps Apply disabled until `assignmentState()` is
    valid (`validateArray` still checks the result)
- Choices stay native radios and checkboxes inside labels, so `FormData` and keyboard use are
  unchanged.

## Motion rules

- Every animation checks the per-user Motion setting (`full`, `subtle`, `off`); the OS
  reduced-motion preference is deliberately ignored.
- Loops are allowed only for the near-death consciousness pulse and the untreated-major drip.
- WebGL effects go through `effect(kind, target)` with kinds `sparks`, `shock`, `embers`, `flare`,
  `spatter`, `ash`, `steam`, `lightning`, `glint`, `puff`, `dust`. With GPU effects off, or after Auto
  detects slow frames, the same call falls back to page particles.
- A document change that should be felt is queued with `queueImpact(actorId, {kind, …})`. `wireSheet`
  plays it once on every open sheet of that actor, if it is under 5 s old. `sheets.mjs` queues these
  kinds:
  - `createItem`: a wound gives `wound`.
  - `updateItem`: a wound marked healed gives `heal`; one marked treated gives `treat`.
  - `updateActor`: `system.dead` gives `death`, `system.shift.active` gives `shift`, and
    `system.shift.armourIntact` turning false gives `armour`.
  - Sheet actions queue `unpack` and `restock` before their own update.
- Cards with an effect carry `data-fx`: `flare`, `wound`, `death`, `shift`, `luck`, `luck-approved`,
  `luck-declined`. Chat cards animate only when created while the client is connected, after Dice So
  Nice's `diceSoNiceRollComplete` for that message. A luck card's approved or declined beat plays once,
  on clients that had already rendered its earlier state, never on reload.
- Tab state that motion needs lives on the sheet app:
  - `_search`: the search text, kept across renders
  - `_twDeal`: set by a filter chip, so the next render re-deals the cards
  - `_twGrowth`: the last growth marks, diffed so an award is stamped and a strike-out knocked
  - `_twLive`: the last `data-live` values, for direction-aware feedback

## Settings

`motion` (`full` / `subtle` / `off`), `gpu` (`auto` / `on` / `off`) and `gore` (`default` / `graphic` /
`restrained` / `clinical`) are client settings; `goreDefault` is the world's. `applyBodyClasses()`
mirrors them onto `body`, and a change re-renders every open `tw` application. Outside Foundry they
read `globalThis.__twSettings`, else full intensity.

## Harness and tests

`scripts/preview.mjs` renders the real templates and builders in node against fabricated data and
never touches a world; its pages load the browser modules from the system root, so motion and effects
run there too (pages listed in `field-dossier-design.md`). `npm test` runs `tests/*.test.mjs` against
the node-safe modules only, including `dialogs.test.mjs`, `actions-record.test.mjs` and
`party-titan-wounds.test.mjs`.
