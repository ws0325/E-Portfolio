# Ko0808/p5Projection — Repository README

> **Last Updated**: March 15, 2026 (15:37 +0800) — Merged PR #8 (texture branch)  
> **Repository**: https://github.com/Ko0808/p5Projection.git  
> **Local Path**: `c:\Users\koupe\Documents\Taylors\Bachelor\LightingInteractive\LightingFinal`

---

## 1. Project Overview

An interactive 2-player game titled **"ISD 60504 - FLY ME To THE MOON"**, developed as an academic assignment (Bachelor, Taylor's University).  
After the initial sprint on March 13, the project was extended with **projection mapping support** and a **background texture generation toolset**.

### Game Content

- **Player 1 (Left Half)**: Controls a rocket via hand tracking (webcam), flying toward the right edge to collect clean energy orbs.
- **Player 2 (Right Half)**: Pilots a UFO up/down with hand tracking, firing lasers to hinder Player 1.
- **Win Condition**: Player 1 must collect 100% clean energy orbs and return to the left edge → **MISSION SUCCESS**.

### Technology Stack

| Technology | Purpose |
|---|---|
| **p5.js** | Graphics rendering, physics, game loop |
| **ml5.js (HandPose)** | Real-time hand tracking via webcam |
| **p5.sound** | BGM and sound effects |
| **HTML5 Canvas** | Rendering foundation |

---

## 2. File Structure

```
p5Projection/
├── index.html                    # Entry point — loads p5.js, ml5.js, scripts
├── sketch_260227b.js             # Main game logic ★
├── Player2.js                    # Player 2 / enemy object classes
├── mapper.js                     # 🆕 Projection mapping utility
├── CREATE_BG_TEXTURE.js          # 🆕 Background texture generation script
├── generate-bg-texture.html      # 🆕 Browser tool for generating BG textures
├── BACKGROUND_TEXTURE_GUIDE.md   # 🆕 Usage guide for the texture pipeline
├── sketch.properties             # 🆕 p5.js sketch configuration
├── SoundEffect/
│   ├── bgm.mp3                   # Background music
│   ├── explosion.mp3             # Explosion SE
│   └── lazer.mp3                 # Laser SE
├── image/                        # 🆕 Image assets folder
├── libraries/
│   └── p5.min.js                 # Core p5.js library
├── Player_2_Code/                # Initial Player 2 prototype (reference)
└── index/                        # Alternative index version (Week 6 save)
```

> 🆕 = Added after the initial March 13 sprint

---

## 3. Commit History (32 Commits)

Development occurred from **February 27 to March 15, 2026**, with the bulk of the game completed in a single intensive sprint on March 13. Post-submission work on March 15 finalized the projection mapping and texture pipeline systems.

---

### Phase 1 — Initial Setup (Prior to March 6)

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 1 | `f77a6ac` Initial commit | 2026-02-27 | `index.html`, `sketch_260227b.js` (222 lines), `p5.min.js`. Prototype: rocket steered by hand tracking. |
| 2 | `7768014` add player2 | 2026-03-06 | Added `Player2.js` (69 lines) and `Player_2_Code/`. Player 2 mouse-control prototype. |
| 3 | `06e09b5` Merge PR #1 (TwoPlayer) | 2026-03-06 | Merged TwoPlayer branch into main. |

---

### Phase 2 — 2-Player Hand Control Integration (Morning, March 13)

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 4 | `dce4554` week6Saved | 2026-03-13 09:00 | Saved alternative version under `index/`. |
| 5 | `c5a16c8` add Two player with hand control | 2026-03-13 09:30 | Full 2-player hand tracking. Screen split left/right; hands auto-assigned by position. |
| 6 | `b804ca4` add some se | 2026-03-13 09:46 | Added BGM, explosion, and laser sound effects. |
| 7 | `9947d34` change lazer control logic | 2026-03-13 10:04 | Laser fires on pinch gesture (index+thumb < 40px). |
| 8 | `9db545f` UFO control UpDown | 2026-03-13 10:25 | Restricted Player 2 movement to vertical axis only. |
| 9 | `765823f` Merge PR #2 (TwoPlayer) | 2026-03-13 | Merged TwoPlayer branch into main. |

---

### Phase 3 — Scene & Game Flow (Midday, March 13)

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 10 | `14480e1` add moon and earth | 2026-03-13 10:43 | Moon and earth decorative objects at screen edges. |
| 11 | `3e73f16` change scene logic | 2026-03-13 11:04 | **Largest change (+164 lines).** 2-phase scene switching via `isFlipped` flag; orbit animation on reaching right edge. |
| 12 | `b71a4bf` modify animation and recovery logic | 2026-03-13 11:24 | Orbit animation and HP recovery adjustments. |
| 13 | `11f6a3d` Merge PR #3 (scenes) | 2026-03-13 | Merged scenes branch into main. |
| 14 | `639b75f` dinamic speed system | 2026-03-13 13:18 | Dynamic speed: `MAX_SPEED = 2 × max(0.1, p1Health / 100)`. |
| 15 | `f084838` ver2.0 | 2026-03-13 13:28 | Bug fixes and overall refactoring. |

---

### Phase 4 — UI, Effects & Mission Conditions (Afternoon, March 13)

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 16 | `6d760ef` Add UI and Effect | 2026-03-13 14:05 | **+441 lines.** HUD panels, starfield, screen shake, particle explosions, energy orb collection system. |
| 17 | `f703991` Merge PR #4 (UI) | 2026-03-13 | Merged UI branch into main. |
| 18 | `3a65ecc` modify clean energy system | 2026-03-13 14:39 | Adjusted energy collection; MISSION SUCCESS / FAILED logic on return. |
| 19 | `066833f` Merge PR #5 (UI) | 2026-03-13 | Merged UI branch into main. |

---

### Phase 5 — Control Refinement (Evening, March 13)

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 20 | `1eb1d1b` joy stick control to rocket | 2026-03-13 15:06 | Joystick method: wrist position determines rocket angle (+42 / -20 lines). |
| 21 | `61bf772` Merge PR #6 (rocketControl) | 2026-03-13 | Merged rocketControl branch into main. |

---

### Phase 6 — Projection Mapping & Texture Pipeline (Post-submission, March 13–15) 🆕

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 22 | `92c7788` | 2026-03-15 13:22 | Added `p5mapper` — core projection mapping library. |
| 23 | `366847a` | 2026-03-15 13:30 | Adjusted rocket speed dynamics. |
| 24 | `4288dca` | 2026-03-15 13:53 | Balanced game difficulty settings. |
| 25 | `3f4a2fa` | 2026-03-15 13:56 | Test commit for feature integration. |
| 26 | `a478f1d` | 2026-03-15 14:27 | Mapper test: polygon placement and corner calibration. |
| 27 | `5024484` | 2026-03-15 14:55 | Successful all-mapper implementation (`allMapper` branch). |
| 28 | `c346a28` | 2026-03-15 15:00 | Removed legacy background code (cleanup). |
| 29 | `e3c5c11` | 2026-03-15 15:12 | New texture generation completed. |
| 30 | `e831d14` | 2026-03-15 15:30 | Texture pipeline finalized. |
| 31 | `2c1ebf7` | 2026-03-15 15:35 | Modified animation trigger logic for texture events. |
| 32 | `6325f40` | 2026-03-15 15:37 | **Merged PR #8** — Texture branch integration into main. |

**Summary**: Phase 6 saw completion of the **all-mapper projection system** and **background texture pipeline**. The texture branch (`texture`) underwent 6 commits focused on texture generation, animation triggering, and mapper implementation before merging into main via PR #8. All projection-ready assets are now integrated into the core codebase.

---

## 4. Game System Details

### Player 1 (Rocket) Controls

```
Wrist position      → Virtual joystick angle
Index+thumb > 40px  → Thrust ON
Dynamic top speed   → MAX_SPEED = 2.0 × (HP / 100)
Friction            → 0.95 per frame
```

### Game Flow

```
[Start] Player 1 flies right
    ↓ reaches right edge
[Orbit Animation] Circles the right-edge orb
    ↓ completes 1 orbit
[Phase 2] Player 1 returns left
    ↓ reaches left edge
[Energy 100%?]
    YES → MISSION SUCCESS → restart
    NO  → MISSION FAILED  → restart
```

### Collision & Damage System

| Event | Damage |
|---|---|
| Meteorite contact | −15 HP |
| Direct laser hit | −10 HP |
| Laser detonates energy orb (close range) | −30 HP |
| 0 HP | Instant death — HP & energy reset |

---

## 5. Class Structure

### `Player2.js`

| Class | Role |
|---|---|
| `Player2Ship` | UFO ship; wrist Y for movement, pinch gesture to fire. |
| `Laser` | Player 2 projectile; `speedX = ±15`. |
| `Meteorite` | Random-size meteorites approaching from the side. |
| `EnergyOrb` | Collectible item oscillating on a sine wave. |
| `Particle` | Explosion particle effect. |

### `mapper.js` 🆕

Projection mapping utility for rendering the canvas onto a physical surface. Handles quad-corner calibration and transformation matrix calculation for use in installation/exhibition scenarios.

### `CREATE_BG_TEXTURE.js` / `generate-bg-texture.html` 🆕

Standalone toolset for generating background textures outside the main game loop. See `BACKGROUND_TEXTURE_GUIDE.md` for the full usage workflow.

---

## 6. Project Evolution Summary

```
[2026-02-27]  Initial prototype → Single-player hand-tracked rocket
      ↓
[2026-03-06]  Player 2 added → 2-player co-op/versus
      ↓
[2026-03-13 AM]   Hand controls, sound effects, UFO controls
      ↓
[2026-03-13 AM–PM] Scene switching, orbit animation, dynamic speed
      ↓
[2026-03-13 PM]   Massive UI update, energy system, mission results
      ↓
[2026-03-13 Eve]  Joystick control refinement (game v1 complete)
      ↓
[2026-03-15 AM–PM] Projection mapping finalization & texture pipeline
      ↓
[2026-03-15 15:37] PR #8 MERGED → All-mapper + texture branch integrated to main
```

**Development Characteristics**: Core game completed in a single intensive sprint (March 13). March 15 focused on projection mapping system completion and texture pipeline finalization. Feature-branch flow managed via 8+ Pull Requests. Comments in Japanese and Simplified Chinese reflect the international development team.