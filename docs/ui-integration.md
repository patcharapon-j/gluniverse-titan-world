# UI integration contract

The user is designing the final appearance separately. Do not treat `preview/index.html` or the current parchment CSS as the approved visual target.

## Files to replace or adapt

- `styles/titan-world.css`: field dossier styles, scoped with `.tw`.
- `templates/actor.hbs`: one Handlebars root element inside the Foundry ApplicationV2 form.
- `templates/item.hbs`: same requirement for Item sheets.
- `module/sheets.mjs`: prepares view context and maps `data-action` controls to behavior. Keep business rules in the other modules.
- `templates/dossier-outcomes.hbs`: the per-action result ladder rendered under every row of the Actions tab. It expects `outcomes`, `anyOutcome`, and `source` from `actionRow`.

## Preserve

- `system.json` system ID `gluniverse-titan-world` and v14-only compatibility.
- `foundry.abstract.TypeDataModel` schemas in `module/models.mjs`.
- `ActorSheetV2` / `ItemSheetV2` with `HandlebarsApplicationMixin`, `form.submitOnChange`, and inherited document submission/ownership checks.
- Six base stat paths `system.stats.agility`, `technique`, `mind`, `body`, `heart`, `duty`. Display effective values from `actor.tw.stats`; do not overwrite base stats with derived penalties.
- Human loss `system.consciousness.loss`; Titan loss `system.consciousness.titanLoss`. Both have separate maximum adjustments.
- Wound Items and `system.formScope`. Each wound stores its own loss, treatment, and healed-from-major marker.
- `system.shift.active`, `.armourIntact`, `.weak`, `.experienced`, `.absorption`, `.yearsRemaining`, `.notes`.
- Party actor `system.luck.value` and `.max`. Player spending remains a request on their own roll card, approved by the GM.
- Actor-owned Item drag data and UUIDs. Owned move macros resolve the Item UUID.
- Chat uses v14 `messageMode` values `public`, `gm`, `blind`, and `self`; the hook is `renderChatMessageHTML` with native HTML elements.
- The four authored result fields on every move Item: `system.success`, `.partial`, `.failure`, `.snakeEyes`, plus the optional `.doubleSix`. `RESULT_TIERS` and `moveOutcomes()` in `rules.mjs` are the single source of the tier labels and ranges; roll cards, the Actions tab and the Item sheet all read them from there. A roll card must keep printing the tier that landed and the full ladder, so the table never needs the rulebook mid-scene.

## Behavioral modules

| Module | Responsibility |
| --- | --- |
| `rules.mjs` | Pure result classification, modifiers, injury derivation, starting-array validation |
| `models.mjs` | Persisted Actor and Item schemas |
| `rolls.mjs` | Roll dialogs/cards, player luck requests, GM approval queue |
| `actions.mjs` | Creation, loadouts, advancement, injuries, treatment, transformation, consequences |
| `sheets.mjs` | Presentation context and UI action bindings |
| `main.mjs` | Foundry registration, settings, macros |
| `data/content.mjs` | Generated source-backed runtime catalogue |

When replacing layout, preserve readable roll results, current consciousness, active injury warnings, and relevant controls at Foundry-supported viewport sizes. The original UI brief calls for English and an Attack on Titan military identity. The exact selected design takes precedence over the temporary styling.
