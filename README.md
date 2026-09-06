# Titan World · Third Edition

Unofficial Foundry VTT **v14-only** game system built from `docs/Titan World_ 3rd Edition.md`.

The system includes native compendiums and a parchment field dossier inspired by military archives. The resizable sheets use locally bundled fonts, a leather binding, indexed sections, a live injury diagram, and shared party luck. Edits save on change. Open sheets refresh from Foundry documents while preserving scroll, search, and in-progress text editing. Motion is limited to tab changes and highlights on changed values, with reduced-motion support.

## Install from manifest

In Foundry Setup, open **Game Systems → Install System** and paste:

```text
https://github.com/patcharapon-j/gluniverse-titan-world/releases/latest/download/system.json
```

Requires Foundry VTT generation 14. The manifest always points to the latest published release. Use Foundry's system update button for later versions.

## Publish a release

Open this repository's **Actions → Release system → Run workflow**, choose the **main** branch, then select **patch**, **minor**, or **major**. For example, 1.2.3 becomes 1.2.4, 1.3.0, or 2.0.0.

The workflow runs tests, increments both version files, packages the checked-in compendiums and runtime, commits the version change, tags it, and publishes a GitHub release with `system.json` and `gluniverse-titan-world.zip`. Pushes and tags never trigger it automatically. Releases run serially. No Foundry license or custom GitHub secret is required by the workflow.

If publishing fails after the version commit/tag succeeds, upload the packaged assets to that existing tag using GitHub CLI. A fresh dispatch or full job retry increments the version again.

This is an unofficial fan system. Attack on Titan and the supplied Titan World rulebook belong to their respective creators. This repository does not grant rights to third-party rules or artwork.

## Start playing

1. Restart Foundry if it was running when this system was installed.
2. Create a world and choose **Titan World · Third Edition** as its game system.
3. Create a **Soldier / Titan shifter** actor. Use **Create character** to choose and assign a starting stat package.
4. Under **Equipment**, choose **Equip loadout** and select the optional addition. Existing equipment remains in place.
5. The GM creates a **Party luck pool** with the **Create shared pool** button. Set one or two points per player.
6. Assign each player ownership of their Soldier actor. Keep the Party actor at Observer for players so they request luck through chat instead of changing its balance.
7. Open **System guide** for the automation boundaries and explicit GM rulings. All source material is in the **Titan World · Third Edition** compendium folder.

No additional modules are required. No remote scripts, fonts, or artwork are loaded by the system.

## Dice So Nice 3D dice

Enable **Dice So Nice! 6.2.9 or newer** in your world's Manage Modules screen, then reload. Stat rolls, field actions, hotbar rolls, and initiative use its native chat integration. Approved luck rerolls append a new roll to the original message; the latest attempt determines the result. Luck +1 changes the total without throwing dice again. Original visibility, speaker, and author remain intact, so Dice So Nice controls recipient visibility and player/actor appearance.

In Dice So Nice's appearance settings, the optional **Titan World · Regimental green** theme adds green metal dice with ivory numbers. Existing player choices remain unchanged. Animation timing, sound, secret-roll behavior, and initiative animation remain controlled by Dice So Nice settings.

Integration follows the official [chat integration](https://riccisi.gitlab.io/foundryvtt-dice-so-nice/api/integration/), [roll update API](https://riccisi.gitlab.io/foundryvtt-dice-so-nice/api/roll/), and [theme API](https://riccisi.gitlab.io/foundryvtt-dice-so-nice/api/customization/). Inspected against installed Dice So Nice 6.2.9. Automated regression checks cover repeated rerolls, +1 after reroll, unchanged visibility for all four modes, and operation without the module. A live 3D animation check is still pending.

## Implemented behavior

- Six editable stats and a validated starting-array assignment dialog; one-time stat advancement up to +3.
- Foundry dice rolls with advantage capped at +3, additional modifiers, difficult rolls, natural snake-eyes/double-six outcomes, visibility modes, and source rules in chat.
- 77 searchable field actions, including the stages of Titan combat, first aid, fear, firearms, wrestling, soldier duties, shifting, and absorption.
- Every one of those actions carries its own 10+, 7–9, 6-or-lower and snake-eyes result, written out from its source section. The roll card prints the tier that landed and lists the whole ladder beside it, and each row of the Actions tab expands to the same ladder before you roll. Where the rulebook leaves a tier undefined, the text says so and hands the call to the GM.
- Editable equipment quantities, first-aid-kit uses, carried modifiers, and starting packs with their choices.
- Region/type/severity injury Items, derived penalties and consciousness, treatment/downgrade actions, and editable GM adjustments.
- Separate human and Titan wound ledgers and exhaustion. Transformation applies supported power modifiers while preserving the human body state. New Titan bodies can discard old Titan wounds.
- Nine Titan powers; Armoured, Colossal, Jaw, Cart, and selected Beast/Female stat bonuses. Other power effects retain the complete source text for GM resolution.
- Shared luck with player requests, GM approval, serialized spending, stale-request/duplicate protection, post-roll +1, rerolls, and mission refresh.
- GM chat consequences for injury, consciousness, next-roll difficulty, dodge fatigue, shifting, and rest.
- Drag-and-drop Items, Item sheets, and owned move hotbar macros.
- Agility initiative for Foundry's combat tracker. Use one representative per group for group firefights.

## Compendium inventory

| Pack | Documents |
| --- | ---: |
| Rules and GM guide | 68 journals |
| Field actions | 77 Items |
| Equipment and loadouts | 38 Items |
| Nine Titan powers | 9 Items |
| Injury templates | 72 Items |
| Advancement | 4 Items |
| Character and Titan templates | 6 Actors |

The rules pack contains a complete-rulebook journal, a system guide, and 66 source-section journals. The equipment pack contains 35 equipment entries and three loadouts. The injury pack covers six regions × three severities × four types. Actor templates include all four starting arrays and two generic Titans.

The source supplies no named NPC statblocks, item prices, or damage-dice catalogue. Generic Titan stats other than Body +3 are clearly marked editable examples. Full source text is retained; no extra canon statblocks are invented.

## GM-assisted boundaries

The GM decides narrative eligibility and consequences. Positioning, opposed-roll ties, bleeding intervals, injury severity, death, regeneration timing, amputation, ammunition expenditure, partial forms, and power combinations are not silently resolved by the software.

The guide documents contradictions in the source, including nape prerequisites, crippling wounds and shifting, firearm evasion thresholds, and the experienced transformation table. Two world settings control wound stacking and whether wounded Body also lowers maximum consciousness. The default avoids counting chest damage twice.

Player owners can maintain their own ledgers and base stats, as with a paper character sheet. GM consequence buttons and shared-luck approval are restricted to GMs. The system is not an anti-cheat service.

## Validation and version support

Live validation used the installed **Foundry 14.363**, with 25 document/API integration checks, 11 pure rules tests, and manual GM/player workflow tests. The latest researched stable release is **14.367**. Its exact runtime has not been installed or tested here; the manifest truthfully records 14.363 as verified and limits compatibility to generation 14.

Research references:

- [Foundry v14 API](https://foundryvtt.com/api/v14/index.html)
- [ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html)
- [System development and manifest format](https://foundryvtt.com/article/system-development/)
- [Foundry 14.367 release notes](https://foundryvtt.com/releases/14.367)

## Developer commands

Requires Node 24. Build tooling uses `classic-level`, `showdown`, and `handlebars` from the installed Foundry application. Set `FOUNDRY_APP` for an alternative build-tool runtime path.

```powershell
npm run build
npm test
npm run check
```

Close worlds using this system before rebuilding compendiums. Never rewrite an open LevelDB pack. Stable document IDs are derived from type and name. The source hash and document inventory are in `docs/content-audit.json`.

`scripts/prepare-qa.mjs` prepares a disposable test world under the OS temporary directory. It copies the existing local Foundry license without printing it. `--sync` updates runtime files only; `--sync --packs` replaces test packs and requires the test server to be stopped. This tool does not modify real worlds. `tests/qa-runtime.mjs` is copied into the QA system only and is never imported by the installed production entry point.

## UI handoff

The field dossier follows the supplied HTML draft, with live Foundry data and refined controls. See `docs/field-dossier-design.md` for its visual direction. Preserve data paths, registered actions, ownership checks, and compendium IDs when extending it. Font licenses are bundled in `assets/fonts`.
