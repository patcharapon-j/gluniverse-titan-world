# Validation report

Date: 2026-09-06. System version: 1.0.0. Runtime: Foundry VTT 14.363, Node 24.16.0.

Testing used a separate temporary data directory and two browser sessions. Real Foundry worlds were not modified.

## Automated checks

- 11 pure rules tests passed: natural extremes, difficult thresholds, regional wound stacking, piercing penalties, consciousness/coma/death review, mindless Titans, separate body ledgers, Armoured modifiers, exceptional weak forms, fatigue, and exact starting arrays.
- Syntax checks passed for all JavaScript modules. Both Handlebars templates compile.
- Manifest entry points, assets, v14-only bounds, and expected content counts passed.
- 25 live Foundry integration checks passed:

| Check | Result |
| --- | --- |
| All seven native compendium packs load with expected counts | Pass, 7 checks |
| Complete rulebook contains its page text | Pass |
| Actor model and derived data | Pass |
| Embedded wounds update derived values | Pass |
| Treatment updates restore derived values | Pass |
| Armoured transformation modifiers | Pass |
| New wounds receive the active body/form | Pass |
| Human stats ignore Titan-body injuries | Pass |
| ActorSheetV2 renders | Pass |
| All six ItemSheetV2 types render | Pass, 6 checks |
| Roll serialization | Pass |
| Luck +1 spends exactly one point | Pass |
| Duplicate luck approval is rejected | Pass |
| Reroll replaces dice and clears the prior luck bonus | Pass |

## Manual browser workflows

- Created a Soldier package through both assignment dialogs.
- Equipped the Scout/Garrison pack with a full first-aid kit; verified blades, gas, other supplies, and three kit uses.
- Recorded a major head injury; effective Mind fell by one and consciousness fell from 3 to 1 while the base stat remained unchanged.
- Rolled Line up a nape strike; chat displayed the dice, modifier, result, and source section.
- Logged in as a separate player who owned the Soldier actor.
- Verified the Party balance was read-only for the player and the mission-refresh control was absent.
- Verified the player could roll their own actor and had no GM consequence controls.
- Sent a player luck request, approved it from the GM session, and observed the player result increase from 10 to 11 with the pool decreasing from 2 to 1.

## Corrections found during validation

- Blank Markdown headings had produced duplicate empty journal titles. Restricted heading parsing; the final rules pack has 68 meaningful journals.
- Removed the obsolete asynchronous-evaluation option from Foundry rerolls.
- Corrected temporary-sheet header contrast and a style collision in the consciousness meter.

## Limits

The exact latest release, 14.367, was researched but not installed here. The manifest records 14.363 as verified. Final artwork and visual styling await the user's selected design. Narrative consequences and source contradictions remain GM-assisted by design; this is not a full combat simulation.
