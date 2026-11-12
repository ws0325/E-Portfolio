# E-Portfolio

The personal portfolio site of **Wang Sai**, live at **https://www.silaswang.space**.

It is a small static site: plain HTML, CSS and JavaScript, with no build step. Every push to the `main` branch is deployed automatically by [Vercel](https://vercel.com).

## What is on the site

- **Home page** (`index.html`): hero, about, projects, blog and contact sections. There are no cards or panels: the text sits straight on the background.
- **Projects carousel**: move between projects with the arrow buttons, the dots, the keyboard arrows, a swipe, or by dragging with the mouse.
- **Project page** (`lighting-design.html`): the write-up for *Lighting Design* ("FLY ME To THE MOON"), with a button to play the game.
- **Project page** (`autofigma-appdesign.html`): the write-up for *AutoFigma-AppDesign*, a Claude Code skill that designs iOS apps in Figma from Behance references.
- **English / 中文 switch**: the text is translated in the browser and the choice is remembered.
- **Background**: a "pixel black" page covered in orange pixel-art sparks, drawn on a canvas by `app.js` in three depth layers. The layers follow the scroll at different speeds (parallax), twinkle, and light up near the pointer.
- **Motion**: scroll parallax, a scroll progress bar, a custom cursor and click effects. All of it respects the visitor's "reduce motion" setting, and the parallax is gentler on phones.
- **Responsive layout** with a mobile menu.

## Project: Lighting Design

A two-player interactive game controlled by hand tracking (p5.js and ml5.js), built with a team for a university assignment. It runs in the browser and needs a webcam. The playable copy lives in [`projects/lighting-design/`](projects/lighting-design/); its README explains the controls, the file layout and the project history.

## Project: ChoraNomad 3D Room Prototype

An interactive 3D prototype (Three.js) of a street-side glass work room, made for a business showcase in Multidisciplinary Project II. A visitor can book the room, pay (simulated), enter with a QR code, run a video-call session and leave. Payment, QR check and the meeting login are all simulated.

The scene is a rainy night street:

- **Rain**: falling streaks, splash rings on the ground and roof, drops that sit on and run down the glass, and an optional rain sound. The "Rain" and "Rain sound" buttons (bottom left) switch them.
- **Wet ground**: the pavement and road darken, turn glossy and hold puddles that mirror the room, the lamps and the buildings.
- **Light and shadow**: the two nearest street lamps cast shadows, and each lamp has a soft cone of light that shows up in the rain.
- **Detail**: roof kit (solar array, ventilation unit, drip edge), door canopy, doormat, a sign by the door, cushions, a laptop, a mug and a plant inside, a person with an umbrella, fuller trees, bollards, and building facades with framed windows.

How it is put together: the room itself is a built bundle in [`projects/choranomad-3d/assets/`](projects/choranomad-3d/assets/) (its source code lives outside this repository). Everything in the list above lives in one readable file, [`projects/choranomad-3d/enhance.js`](projects/choranomad-3d/enhance.js), which is loaded after the bundle. The bundle hands it the scene through a small hook, `window.__CHORA__` (three.js classes, scene, camera, renderer, the room and a per-frame callback). If the bundle is ever rebuilt from its source, that hook has to be added again in the entry file, just before the render loop starts, with a call to `window.__CHORA__.onFrame` inside the loop.

## Project: AutoFigma-AppDesign

A Claude Code skill that designs a whole iOS app in Figma from real Behance references, with sourced numbers and checks against Apple HIG, without the "AI look". The portfolio has a write-up page; the code lives in its own repository, [ws0325/AutoFigma-AppDesign](https://github.com/ws0325/AutoFigma-AppDesign), and the screenshots on the page come from that repo's README.

## Folder structure

```text
E-Portfolio/
├── index.html              Home page
├── lighting-design.html    Project page for Lighting Design
├── autofigma-appdesign.html  Project page for AutoFigma-AppDesign
├── styles.css              Styles for all pages
├── app.js                  Pixel background, parallax, carousel, cursor, menu, language switch
├── images/                 Pictures used by the pages
└── projects/
    ├── lighting-design/    The playable game (has its own README)
    └── choranomad-3d/      The 3D room prototype: built bundle (Vite output) plus
                            enhance.js / enhance.css (rain, wet street, extra detail)
```

Folder and file names are lowercase, with hyphens and no spaces. Windows treats `Images` and `images` as the same folder, but web servers (including Vercel) do not, so mixed case can work on your own computer and then break online.

## Run it locally

```bash
python -m http.server 5500
```

Then open <http://localhost:5500>. Use a local server rather than opening the files directly, so the game can load its images and sounds. Browsers allow webcam access on `localhost`.

## Adding another project

1. Put the project's files in `projects/<project-name>/`.
2. Add a page `<project-name>.html` next to `index.html`, and add an `<article class="slide">` for it in the projects carousel in `index.html` (the arrows, dots and counter pick it up by themselves).
3. Keep names lowercase, with hyphens instead of spaces.

## Credits

The Lighting Design game was made by a team; the original repository is [Ko0808/p5Projection](https://github.com/Ko0808/p5Projection). This repo keeps a trimmed copy so the game can be played from the portfolio site.
