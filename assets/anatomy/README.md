# Wound display assets

Generated with the built-in image generation tool on 2026-09-12. Generated PNGs are preserved; SVG alpha or luminance masks remove generated backgrounds at runtime. No external service is needed at runtime.

- `body-cadet.png`: young-adult, gender-neutral PC study with a straighter torso and relaxed uniform fit. `body-cadet-mask.png` supplies its luminance matte.
- `body-render.png`: retained original PC study in a Survey Corps jacket, cream shirt and trousers, harness and tall leather boots. The face has no identifying features. Painted semi-realistic JRPG style.
- `titan-render.png`: a separate crimson-muscle and ivory-tendon Titan study, with a skeletal face and an opaque waist covering. It has its own regional partitions and wound coordinates.
- `wound-atlas.png`: painted cutting, piercing, blunt and burn decals, in reading order, with dark torn edges that merge with the uniform and Titan tissue.
- `treatment-painted.png`: painted gauze, splint, exposed stump and stitched scar, in reading order.
- `treatment-atlas.png`: supplies only the alpha mask for the repainted treatment atlas. Its original photographic colors are not displayed.

## Generation prompt briefs

PC: Appearance-neutral mannequin with balanced proportions and a featureless head, wearing the Attack on Titan soldier uniform. Semi-realistic painted anime art with controlled linework, shaded leather and cloth, and upper-left illumination. Full anterior figure on a transparent 1:2 canvas.

Titan: Covered anatomical fantasy construct with a skeletal face, red muscle pattern and ivory tendon detail. The body has a dark opaque waist covering. Hand-painted JRPG art matching the PC study's light and rendering style.

Wounds and treatment: Visceral, tactile painted textures with recessed dark tissue, torn fibers, bruising and char, complemented by gauze, wooden splints and stitched scars. No photographic skin slabs around the wound decals. Exact final prompts are in `generation-prompts.json`.

## Rendering and maintenance

`module/figure.mjs` composites the images with SVG crops. Each body is partitioned into addressable anatomical regions, with removable lower limbs and a removable Titan head. Wound decals are clipped both to their region and to that body's alpha. Treatment and scar decals replace open wounds. The treatment repaint's background is removed using the original atlas alpha mask in SVG. Graphics remain separate from the injury rules.

Graphic mode uses detailed textures. Restrained mode uses subdued symbolic injuries. Clinical mode uses region hatching. Sheet and inspector figures have separate identifiers so their masks cannot collide. The inspector uses a native popover with close, Escape and outside-click dismissal.

Review `preview/wounds.html`, `preview/wounds-narrow.html`, `preview/figures.html`, `preview/wounds-coma.html`, and `preview/titan-killed.html` after changing geometry or assets. The preview generator renders the production templates and figure code with fixture actors; it does not change a live world's actors.

`titan-ordinary.png` is the skin-covered default Titan. It uses the original Titan alpha at runtime to mask the generated background. Only an equipped Colossal power selects exposed-muscle art. The Armoured power selects `titan-armoured.png` or `titan-armoured-broken.png` according to the existing armour-intact field. Armour is part of the segmented body image, so it scales with the figure and is removed along with lost limbs. Other special Titans share the ordinary base; this is not a complete set of bespoke Nine Titan portraits.

Treatment uses a pale gauze backing, wraps or splints, no active bleeding, and explicit treated/dressed labels. The Foundry treatment dialog uses CSS selection markers because DialogV2 sanitizes inline SVG; text has an explicit second grid column.

Additional review pages: `preview/armour-intact.html` and `preview/armour-broken.html`. Live isolated Foundry checks cover dialog width after sanitization, disabled treatments, Cancel, Apply, dressing refresh and consciousness restoration.
