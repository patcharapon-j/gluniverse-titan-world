# Field dossier implementation direction

Reference: user-supplied fielddossierv2.html, inspected as source. The user requests refinement beyond the draft, rather than an exact copy.

- Layout: 980 × 820 resizable Foundry sheet; fixed dossier header and indexed tabs; independently scrolling paper. Header portrait / editable identity / consciousness. Overview has a 3 × 2 stat grid and a 280px field sidebar. Other pages retain every current action and data field.
- Type: locally bundled Playfair Display for names, values and headings; Special Elite for archival labels; Noto Serif for prose. Body 13px, labels 11px, name 38px, stats 48px. Small text is larger than the draft.
- Palette: warm paper #ece2cb, highlight #f4ecd8, ink #241f1b, muted #6b5f50, red #8e2323, green #354d3e, brass #b9924a, leather #3a2618.
- Spacing: 4px base, 8–12px component gaps, 20px section gaps, 26px paper margins. Compact secondary actions, 36px minimum primary controls.
- Components: sharp file tabs, inset paper stat cards, brass rules, archival status stamp, portrait photo corners, condition regions, item rows and shared luck pips.
- Atmosphere: static paper grain and binding marks, inset edge shading, restrained leather texture. No animated textures, gloss sweeps, looping glows, or repeated entrance staggers.
- Interaction: 140ms hover tint, 160ms tab transition only after navigation, 400ms highlight only for changed live values. Reduced-motion preference disables animation. Foundry owns roll outcomes and persistence; the mockup's sample data and simulated dice are not used.
- Live updates: actor and embedded item documents drive sheets. Shared party changes refresh displayed pools across sheets. Preserve scroll, search, expanded sections, and in-progress text editing through external updates.
