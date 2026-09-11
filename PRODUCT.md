# Product

<!-- impeccable:product-schema 1 -->

<!-- Written 2026-09-11 from the user's answers in the Titan World 2.0 grilling session;
     full decision record in docs/ui-2.0-spec.md. -->

## Platform

web

## Users

- **Players** of Titan World (3rd Edition, an unofficial Attack on Titan fan TTRPG) running
  Survey Corps soldiers and Titan shifters inside Foundry VTT, reading and clicking their
  sheet mid-combat, usually over a battle map during evening sessions.
- **The GM**, who resolves consequences (injuries, fatigue, difficulty), approves party
  luck spends and reads every roll card in the chat log.

## Product Purpose

A Foundry VTT v14 game system that makes Titan World playable at the virtual table:
character sheets (soldier, titan, party), items, a 2d6 roll workflow with authored result
tiers for 77 field actions, injuries by body region, supplies, shifter powers and a
shared luck pool. Success is a sheet that is fast to read and act on at the table and
that makes the setting's danger felt.

## Positioning

The only Foundry system for Titan World. Its distinctive mechanism is that the rules'
physical stakes — ODM gas and blades running out, bodies being cut, crushed, burnt and
bitten, the Curse of Ymir counting down — are represented as tactile objects and a
visceral body rather than as numbers.

## Operating Context

- Foundry VTT **v14 only** (`system.json` minimum/verified/maximum 14). Sheets are
  ApplicationV2 windows floating over the scene canvas; roll results arrive as chat
  cards in the sidebar and may be hidden until Dice So Nice finishes animating.
- No build step: plain ES modules, one stylesheet, Handlebars templates, local fonts.
  Tests via `npm test`, template/manifest validation via `npm run check`, an offline
  preview harness via `npm run preview` / `preview:serve` (port 8123).
- Local test world `titan-world`; only Dice So Nice enabled.

## Capabilities and Constraints

- Data paths, `data-action` names, `tw`-prefixed Handlebars helpers, `messageMode`,
  `renderChatMessageHTML` and `RESULT_TIERS` must survive; markup compatibility with 1.x
  does not need to.
- Every roll opens the roll dialog (user decision).
- No sound. Localisation out of scope.
- Rules deliberately leave gas and ammunition abstract; no rules automation for
  consumables in 2.0.

## Brand Commitments

- Setting: Attack on Titan's Paradis — Walls, Survey Corps, ODM gear, mindless Titans,
  the Nine Titans. Grim: injury, amputation, being eaten.
- The Survey Corps wings emblem (`assets/crest.svg`, icon sprite `wings`).
- The **field dossier** look (paper in a leather binder, brass, red ink, stamps,
  typewriter labels, per-statistic inks; `docs/field-dossier-design.md`). 2.0 is a v2
  of it — more compact, tactile and polished — not a new visual world (user decision
  after reviewing an ODM-industrial alternative; see docs/ui-2.0-spec.md).

## Evidence on Hand

- Full rulebook: `docs/Titan World_ 3rd Edition.md`.
- Authored content: 77 field actions with every result tier, equipment, loadouts and
  injuries in `data/content.mjs`.
- No character art ships with the system; portraits come from users' actors.

## Product Principles

1. Read at a glance mid-combat first; every flourish must sharpen information.
2. The setting's physicality is the interface: gear you pull, a body that bleeds.
3. Big moments (rolls, wounds, death, transformation) are felt by the whole table.
4. Every viewer controls intensity for themselves (motion, GPU effects, gore).

## Accessibility & Inclusion

Per-user Motion, GPU effects and Gore settings; the OS reduced-motion preference is
deliberately not used (user decision). Every drag has a click equivalent; keyboard focus
stays visible.
