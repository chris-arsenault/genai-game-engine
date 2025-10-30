# Visual Asset Generation Briefs – AR-001 to AR-005

## Context
- Derived from `assets/images/requests.json` outstanding requests tagged AR-001 through AR-005.
- Prompts target OpenAI image generation with a neon-noir, investigation-meets-metroidvania tone.
- Tailored to support branching narrative cues (faction color coding, evidence readability, infiltration stakes).

## Prompt Template Notes
- **Base Style**: Ultrawide lighting gradients, volumetric fog, neon reflections on wet surfaces, subtle chromatic aberration.
- **Framing**: 3/4 perspective unless otherwise specified; ensure UI assets leave negative space for text overlays.
- **Negative Prompt Snippets**: `blurry`, `low detail`, `muted colors`, `anachronistic fashion`, `steampunk`, `fantasy armor`, `logo watermark`, `text overlay`, `hands`.

---

## AR-001 – Deduction Board Interface

### Visual Goals
- Synthwave corkboard blended with holographic circuitry.
- Clear anchor points for clue nodes and connection strands.
- Buttons/icons must remain legible at 32–64 px without aliasing.

### Prompt: Deduction Board Background (`image-ar-001-deduction-board-bg`)
```
neon noir detective office deduction board, translucent glass panels layered over worn corkboard, cyan and magenta fiber optics tracing between metal data pins, glowing quest nodes orbiting empty center space, volumetric mist, cinematic key light from above, 1024x768 aspect, ultrasharp UI art, cohesive cyberpunk investigation mood
```

### Prompt: Clue Node Variations (`image-ar-001-clue-node-pack`)
```
set of three holographic clue node icons, circular frames with concentric neon rings, variants for active, solved, locked states, subtle animated energy orbit, designed for 64x64 sprite export, cyan-magenta-gold palette, clean silhouettes, emissive edges, no background
```

### Prompt: Evidence Type Icons (`image-ar-001-evidence-icon-set`)
```
four minimalist evidence category icons on transparent background, physical evidence lockbox, glowing data shard, testimonial waveform, forensic analyzer vial, neon noir color accents, crisp linework, pixel-friendly 32x32 sizing, consistent stroke weight
```

### Prompt: Core UI Buttons (`image-ar-001-ui-button-pack`)
```
pack of five cyberpunk interface buttons showing play, pause, settings gear, confirm checkmark, cancel cross, pill-shaped chrome housings with dual-state hover/pressed lighting, cyan and amber rim lights, 64x32 aspect, exported on transparent atlas, tactile depth cues
```

---

## AR-002 – Evidence Pickup Sprites

### Visual Goals
- High readability at 32x32 px with faction color accents.
- Variants should share materials for consistency.
- Reinforce investigative storytelling (procedural numbering, forensic glow).

### Prompt: Generic Evidence Marker (`image-ar-002-generic-marker`)
```
small holographic evidence marker, triangular base with digital number panel left blank, cyan rim light, slender metal legs casting soft shadow, designed for 32x32 sprite, strong silhouette, transparent background
```

### Prompt: Fingerprint Sprite (`image-ar-002-fingerprint`)
```
forensic fingerprint hologram hovering above evidence pad, swirling cyan lines, subtle particle drift, 32x32 sprite scale, transparent background, crisp neon glow, conveys sci-fi investigation tech
```

### Prompt: Confidential Document (`image-ar-002-document`)
```
folded dossier with holographic seal, semi-transparent glass paper edges, magenta security ribbon glowing, metallic corner clamps, designed for 32x32 pixel art upscale, transparent background, readable silhouette
```

### Prompt: Neural Extractor Device (`image-ar-002-neural-extractor`)
```
compact neural extraction tool, handheld chrome body with twin extendable prongs, blue accent LEDs, subtle heat vents, 32x32 sprite readability, transparent background, balanced perspective
```

### Prompt: Blood Spatter Sample (`image-ar-002-blood-spatter`)
```
sterile forensic sample container holding stylised blood spatter suspended in gel, rectangular vial with cyan anti-contamination field, 32x32 sprite clarity, transparent background, respectful tone
```

---

## AR-003 – Player Character Sprite Sheet

### Visual Goals
- Heroine Kira in trench coat, investigative gadgets visible.
- 6-frame idle/walk/run loops for four directions.
- Maintain silhouette readability in stealth and combat contexts.

### Prompt
```
pixel art sprite sheet, 32x32 detective heroine named Kira, long coat with teal interior lining, cybernetic monocle, holstered scanner at hip, four directions (front, back, left, right), idle, walk, run animations with six frames each, neon noir palette with high contrast, consistent lighting, transparent background
```

---

## AR-004 – NPC Sprite Packs

### Visual Goals
- Civilians reflect faction loyalties via color bands and accessories.
- Guards convey threat level through visor glow and armor plating.
- Ensure diversity in silhouettes and readable stances.

### Prompt: Civilian NPC Pack (`image-ar-004-npc-civilian-pack`)
```
set of five pixel art civilians for neon city hub, 32x32 sprites, diverse body types and genders, faction color accents (teal, amber, violet), layered streetwear with tech accessories, neutral walking posture, transparent background, consistent lighting
```

### Prompt: Security Guard Pack (`image-ar-004-npc-guard-pack`)
```
pack of three pixel art security guards, 32x32 sprites, armored jackets with glowing visors, faction insignia on shoulder, patrolling stance, color-coded detection matrix lights, transparent background, stealth-action tone
```

---

## AR-005 – District Tilesets

### Visual Goals
- Each 16x16 tile atlas should include ground, walls, props, animated elements.
- Capture environmental storytelling for multiple genres (investigation hub + action infiltration).
- Ensure tiling seams vanish; reserve layers for collision metadata later.

### Prompt: Neon District Tileset (`image-ar-005-tileset-neon-district`)
```
16x16 pixel art tileset, rain-soaked neon boulevard, reflective asphalt, holographic signage frames, animated puddle highlights, modular facades with fire escapes, cyan and magenta light gradients, includes corner, edge, interior tiles, exported on transparent atlas grid
```

### Prompt: Corporate Spires Tileset (`image-ar-005-tileset-corporate-spires`)
```
16x16 pixel art tileset, sterile high-tech skyscraper interiors, frosted glass walkways, chrome floor panels with embedded light strips, elevator doors, server alcoves, animated white-blue glow strips, clean lines, transparent atlas background
```

### Prompt: Archive Undercity Tileset (`image-ar-005-tileset-archive-undercity`)
```
16x16 pixel art tileset, ancient underground data vault, corroded metal platforms, glowing conduits, floating dust motes animation, vault doors with glyphs, layered depth, warm amber lights against cool shadows, transparent atlas
```

### Prompt: Zenith Sector Tileset (`image-ar-005-tileset-zenith-sector`)
```
16x16 pixel art tileset, imposing futurist plaza with elevated rail tracks, holo banners, marble inlays, kinetic light sculptures, skybridge supports, animated signage flicker, balanced teal-gold palette, transparent atlas export
```

---

## Negative Prompt (Apply as Needed)
```
blurry, low detail, muted colors, anachronistic fashion, steampunk, fantasy armor, logo watermark, text overlay, hands, humanoid distortion, artifacting, low resolution, grainy
```
